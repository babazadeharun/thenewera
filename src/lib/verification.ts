import { createHash, randomInt } from 'node:crypto';
import { prisma } from './prisma';
import type { VerificationChannel } from '@prisma/client';

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

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
  const recent = await prisma.verificationCode.findFirst({ where: { userId, identifier, channel }, orderBy: { createdAt: 'desc' } });
  if (recent && Date.now() - recent.createdAt.getTime() < 60_000) throw new Error('Please wait 60 seconds before requesting another verification code.');
  await prisma.verificationCode.updateMany({
    where: { userId, channel, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await prisma.verificationCode.create({
    data: { userId, identifier, channel, codeHash: hashCode(code), expiresAt },
  });

  if (channel === 'EMAIL') await sendEmailCode(identifier, code);
  else await sendSmsCode(identifier, code);
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
  await prisma.verificationCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  await prisma.user.update({ where: { id: userId }, data: { verifiedAt: new Date() } });
  return true;
}

async function sendEmailCode(to: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error('Email verification is not configured. Set RESEND_API_KEY and EMAIL_FROM.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Your New Era verification code',
      html: `<div style="font-family:Arial,sans-serif;background:#070711;color:#f5f5ff;padding:32px"><h2>New Era</h2><p>Your verification code is:</p><p style="font-size:34px;letter-spacing:8px;font-weight:700">${code}</p><p>This code expires in 10 minutes.</p></div>`,
    }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}.`);
}

async function sendSmsCode(to: string, code: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) throw new Error('SMS verification is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER.');
  const body = new URLSearchParams({ To: to, From: from, Body: `New Era verification code: ${code}. It expires in 10 minutes.` });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`SMS provider returned ${response.status}.`);
}
