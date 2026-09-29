import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { looksLikePhone, normalizePhone, verifyCode } from '@/lib/verification';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawIdentifier = String(body.identifier ?? '').trim();
    const code = String(body.code ?? '').trim();
    if (!rawIdentifier || !/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Enter the 6-digit verification code.' }, { status: 400 });
    const identifier = looksLikePhone(rawIdentifier) ? normalizePhone(rawIdentifier) : rawIdentifier.toLowerCase();
    const user = await prisma.user.findFirst({ where: looksLikePhone(identifier) ? { phone: identifier } : { email: identifier }, include: { client: true } });
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    if (user.verifiedAt) return NextResponse.json({ ok: true, alreadyVerified: true });
    const channel = user.email ? 'EMAIL' : 'PHONE';
    const valid = await verifyCode(user.id, identifier, channel, code);
    if (!valid) return NextResponse.json({ error: 'The code is invalid or expired.' }, { status: 400 });
    await createSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, phone: user.phone, role: user.role, client: user.client } });
  } catch (error) {
    console.error('verify error', error);
    return NextResponse.json({ error: 'Unable to verify the account right now.' }, { status: 500 });
  }
}
