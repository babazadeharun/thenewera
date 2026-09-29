import { NextResponse } from 'next/server';
import { createSession, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { looksLikeEmail, looksLikePhone, normalizePhone, maskIdentifier, sendVerificationCode } from '@/lib/verification';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawIdentifier = String(body.identifier ?? body.email ?? '').trim();
    const password = String(body.password ?? '');
    if (!rawIdentifier || !password) return NextResponse.json({ error: 'Email/phone and password are required.' }, { status: 400 });
    const identifier = looksLikePhone(rawIdentifier) ? normalizePhone(rawIdentifier) : rawIdentifier.toLowerCase();
    const user = await prisma.user.findFirst({ where: looksLikeEmail(identifier) ? { email: identifier } : { phone: identifier }, include: { client: true } });
    if (!user || !verifyPassword(password, user.passwordHash)) return NextResponse.json({ error: 'Email/phone or password is incorrect.' }, { status: 401 });
    if (!user.verifiedAt) {
      const channel = user.email ? 'EMAIL' : 'PHONE';
      const target = user.email ?? user.phone!;
      await sendVerificationCode(user.id, target, channel);
      return NextResponse.json({ error: 'Verification is required before you can log in.', verificationRequired: true, channel: channel.toLowerCase(), target: maskIdentifier(target, channel), identifier: target }, { status: 403 });
    }
    await createSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, phone: user.phone, role: user.role, client: user.client } });
  } catch (error) {
    console.error('login error', error);
    return NextResponse.json({ error: 'Unable to log in right now.' }, { status: 500 });
  }
}
