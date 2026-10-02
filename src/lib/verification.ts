import { createHash, randomInt } from 'node:crypto';
import { prisma } from './prisma';
import type { VerificationChannel } from '@prisma/client';
import { sendEmail } from './email';

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODES_15_MINUTES = 5;
const MAX_CODES_HOUR = 10;

export function normalizePhone(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, '');
  if (compact.startsWith('00')) return `+${compact.slice(2)}`;
  return compact;
}

export function looksLikePhone(value: string) {
  const phone = normalizePhone(value);
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

export function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function maskIdentifier(identifier: string, channel: VerificationChannel) {
  if (channel === 'EMAIL') {
    const [local, domain] = identifier.split('@');
    if (!domain) return identifier;
    return `${local.slice(0, 2)}${local.length > 2 ? '•••' : '•'}@${domain}`;
  }
  return `${identifier.slice(0, 4)}••••${identifier.slice(-3)}`;
}

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

export async function sendVerificationCode(userId: string, identifier: string, channel: VerificationChannel) {
  const now = Date.now();
  const recent = await prisma.verificationCode.findFirst({
    where: { userId, identifier, channel },
    orderBy: { createdAt: 'desc' },
  });

  if (recent && now - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new Error('Please wait 60 seconds before requesting another verification code.');
  }

  const window15 = new Date(now - 15 * 60 * 1000);
  const windowHour = new Date(now - 60 * 60 * 1000);
  const [recent15Count, recentHourCount] = await Promise.all([
    prisma.verificationCode.count({ where: { userId, channel, createdAt: { gte: window15 } } }),
    prisma.verificationCode.count({ where: { userId, channel, createdAt: { gte: windowHour } } }),
  ]);

  if (recent15Count >= MAX_CODES_15_MINUTES) throw new Error('Too many verification requests. Please try again later.');
  if (recentHourCount >= MAX_CODES_HOUR) throw new Error('Too many verification requests. Please try again later.');

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(now + CODE_TTL_MS);

  // Send first so an unavailable mailbox/SMTP failure never creates a seemingly valid OTP record.
  if (channel === 'EMAIL') await sendEmailCode(identifier, code);
  else await sendSmsCode(identifier, code);

  await prisma.verificationCode.updateMany({
    where: { userId, channel, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.verificationCode.create({
    data: { userId, identifier, channel, codeHash: hashCode(code), expiresAt },
  });
}

export async function verifyCode(userId: string, identifier: string, channel: VerificationChannel, code: string) {
  const record = await prisma.verificationCode.findFirst({
    where: { userId, identifier, channel, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!record || record.expiresAt < new Date() || record.attempts >= MAX_ATTEMPTS) return false;

  const valid = hashCode(code.trim()) === record.codeHash;
  if (!valid) {
    await prisma.verificationCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return false;
  }

  await prisma.$transaction([
    prisma.verificationCode.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { verifiedAt: new Date() } }),
  ]);
  return true;
}

async function sendEmailCode(to: string, code: string) {
  await sendEmail({
    to,
    subject: 'New Era — e-poçt təsdiq kodunuz',
    text: `New Era e-poçt təsdiq kodunuz: ${code}\n\nKod 10 dəqiqə ərzində etibarlıdır. Əgər bu əməliyyatı siz etməmisinizsə, bu mesajı nəzərə almayın.`,
    html: `<div style="font-family:Arial,sans-serif;background:#070711;color:#f5f5ff;padding:32px"><div style="max-width:520px;margin:auto"><div style="font-size:12px;letter-spacing:4px;color:#a78bfa;font-weight:700">NEW ERA</div><h2 style="margin:20px 0 8px">E-poçtunuzu təsdiqləyin</h2><p style="color:#c8c8d8">Qeydiyyatı tamamlamaq üçün aşağıdakı birdəfəlik kodu daxil edin.</p><div style="font-size:36px;letter-spacing:10px;font-weight:800;margin:28px 0">${code}</div><p style="color:#9999aa">Kod 10 dəqiqə ərzində etibarlıdır və yalnız bir dəfə istifadə edilə bilər.</p></div></div>`,
  });
}

async function sendSmsCode(to: string, code: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) throw new Error('SMS verification is not configured.');
  const body = new URLSearchParams({ To: to, From: from, Body: `New Era verification code: ${code}. It expires in 10 minutes.` });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`SMS provider returned ${response.status}.`);
}
