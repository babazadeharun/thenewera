import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { prisma } from './prisma';
import type { VerificationChannel } from '@prisma/client';
import { sendEmail } from './email';

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODES_15_MINUTES = 5;
const MAX_CODES_HOUR = 10;
const VERIFICATION_FROM = process.env.MAIL_FROM_ADDRESS || 'hello@thenewera.space';

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

export function verificationErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'MAIL_SMTP_CONFIG_MISSING' || message === 'EMAIL_SMTP_CONFIG_MISSING' || message === 'EMAIL_SMTP_PORT_INVALID') {
    return 'Email təsdiq kodunu göndərmək mümkün olmadı. Zəhmət olmasa bir neçə dəqiqə sonra yenidən cəhd edin.';
  }
  if (message.includes('Please wait 60 seconds')) return 'Yeni kodu 60 saniyədən sonra göndərə bilərsiniz.';
  if (message.includes('Too many verification requests')) return 'Çox sayda təsdiq sorğusu göndərildi. Zəhmət olmasa bir qədər sonra yenidən cəhd edin.';
  if (message.includes('SMTP') || message.includes('Email provider') || message.includes('E-poçt') || message.includes('Email')) {
    return 'Email təsdiq kodunu göndərmək mümkün olmadı. Zəhmət olmasa bir neçə dəqiqə sonra yenidən cəhd edin.';
  }
  return 'Təsdiq kodunu göndərmək mümkün olmadı. Zəhmət olmasa bir neçə dəqiqə sonra yenidən cəhd edin.';
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
  const recent = await prisma.verificationCode.findFirst({ where: { userId, identifier, channel }, orderBy: { createdAt: 'desc' } });
  if (recent && now - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) throw new Error('Please wait 60 seconds before requesting another verification code.');

  const window15 = new Date(now - 15 * 60 * 1000);
  const windowHour = new Date(now - 60 * 60 * 1000);
  const [recent15Count, recentHourCount] = await Promise.all([
    prisma.verificationCode.count({ where: { userId, channel, createdAt: { gte: window15 } } }),
    prisma.verificationCode.count({ where: { userId, channel, createdAt: { gte: windowHour } } }),
  ]);
  if (recent15Count >= MAX_CODES_15_MINUTES || recentHourCount >= MAX_CODES_HOUR) throw new Error('Too many verification requests. Please try again later.');

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(now + CODE_TTL_MS);

  // Do not persist an OTP until SMTP/SMS accepted the message.
  if (channel === 'EMAIL') await sendEmailCode(identifier, code);
  else await sendSmsCode(identifier, code);

  await prisma.verificationCode.updateMany({ where: { userId, channel, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.verificationCode.create({ data: { userId, identifier, channel, codeHash: hashCode(code), expiresAt } });
}

export async function verifyCode(userId: string, identifier: string, channel: VerificationChannel, code: string) {
  const record = await prisma.verificationCode.findFirst({ where: { userId, identifier, channel, usedAt: null }, orderBy: { createdAt: 'desc' } });
  if (!record || record.expiresAt < new Date() || record.attempts >= MAX_ATTEMPTS) return false;

  const actual = Buffer.from(hashCode(code.trim()), 'hex');
  const expected = Buffer.from(record.codeHash, 'hex');
  const valid = actual.length === expected.length && timingSafeEqual(actual, expected);
  if (!valid) {
    await prisma.verificationCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return false;
  }

  await prisma.$transaction([
    prisma.verificationCode.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.verificationCode.updateMany({ where: { userId, channel, usedAt: null, id: { not: record.id } }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { verifiedAt: new Date() } }),
  ]);

  // Email ownership is now verified. Welcome-email failure must not undo verification.
  try {
    await sendWelcomeEmail(identifier);
  } catch (error) {
    console.error('welcome email send failed', error instanceof Error ? error.message : 'unknown error');
  }
  return true;
}

async function sendEmailCode(to: string, code: string) {
  await sendEmail({
    to,
    fromAddress: VERIFICATION_FROM,
    fromName: 'New Era',
    subject: 'New Era — Email təsdiq kodunuz',
    text: `Salam,\n\nNew Era hesabınızı təsdiqləmək üçün aşağıdakı koddan istifadə edin:\n\n${code}\n\nBu kod 10 dəqiqə ərzində etibarlıdır. Əgər bu qeydiyyatı siz etməmisinizsə, bu emailə məhəl qoymayın.\n\nNew Era komandası`,
    html: `<div style="font-family:Arial,sans-serif;background:#070711;color:#f5f5ff;padding:32px"><div style="max-width:520px;margin:auto"><div style="font-size:12px;letter-spacing:4px;color:#24d1c2;font-weight:700">NEW ERA</div><h2 style="margin:20px 0 8px">Email ünvanınızı təsdiqləyin</h2><p style="color:#c8c8d8">Salam,</p><p style="color:#c8c8d8">New Era hesabınızı təsdiqləmək üçün aşağıdakı koddan istifadə edin:</p><div style="font-size:36px;letter-spacing:10px;font-weight:800;margin:28px 0">${code}</div><p style="color:#9999aa">Bu kod 10 dəqiqə ərzində etibarlıdır və yalnız bir dəfə istifadə edilə bilər.</p><p style="color:#9999aa">Əgər bu qeydiyyatı siz etməmisinizsə, bu emailə məhəl qoymayın.</p><p style="color:#c8c8d8;margin-top:28px">New Era komandası</p></div></div>`,
  });
}

async function sendWelcomeEmail(to: string) {
  await sendEmail({
    to,
    fromAddress: VERIFICATION_FROM,
    fromName: 'New Era',
    subject: 'New Era-ya xoş gəlmisiniz',
    text: `Salam,\n\nNew Era platformasına xoş gəlmisiniz.\n\nBurada xidmətlərimiz, layihələrimiz və sizin üçün hazırladığımız kreativ həllərlə tanış ola bilərsiniz.\n\nSizi aramızda görməkdən məmnunuq.\n\nNew Era komandası`,
    html: `<div style="font-family:Arial,sans-serif;background:#070711;color:#f5f5ff;padding:32px"><div style="max-width:520px;margin:auto"><div style="font-size:12px;letter-spacing:4px;color:#24d1c2;font-weight:700">NEW ERA</div><h2 style="margin:20px 0 8px">New Era-ya xoş gəlmisiniz</h2><p style="color:#c8c8d8">Salam,</p><p style="color:#c8c8d8">New Era platformasına xoş gəlmisiniz.</p><p style="color:#c8c8d8">Burada xidmətlərimiz, layihələrimiz və sizin üçün hazırladığımız kreativ həllərlə tanış ola bilərsiniz.</p><p style="color:#c8c8d8">Sizi aramızda görməkdən məmnunuq.</p><p style="color:#c8c8d8;margin-top:28px">New Era komandası</p></div></div>`,
  });
}

async function sendSmsCode(to: string, code: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) throw new Error('SMS verification is not configured.');
  const body = new URLSearchParams({ To: to, From: from, Body: `New Era verification code: ${code}. It expires in 10 minutes.` });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!response.ok) throw new Error(`SMS provider returned ${response.status}.`);
}
