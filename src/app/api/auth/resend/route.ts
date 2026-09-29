import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { looksLikePhone, maskIdentifier, normalizePhone, sendVerificationCode } from '@/lib/verification';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawIdentifier = String(body.identifier ?? '').trim();
    if (!rawIdentifier) return NextResponse.json({ error: 'Email or phone is required.' }, { status: 400 });
    const identifier = looksLikePhone(rawIdentifier) ? normalizePhone(rawIdentifier) : rawIdentifier.toLowerCase();
    const user = await prisma.user.findFirst({ where: looksLikePhone(identifier) ? { phone: identifier } : { email: identifier } });
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    if (user.verifiedAt) return NextResponse.json({ error: 'This account is already verified.' }, { status: 400 });
    const channel = user.email ? 'EMAIL' : 'PHONE';
    const target = user.email ?? user.phone!;
    await sendVerificationCode(user.id, target, channel);
    return NextResponse.json({ ok: true, target: maskIdentifier(target, channel) });
  } catch (error) {
    console.error('resend verification error', error);
    return NextResponse.json({ error: 'Unable to send a new verification code.' }, { status: 500 });
  }
}
