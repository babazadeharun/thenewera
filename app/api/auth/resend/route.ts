import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { looksLikeEmail, maskIdentifier, sendVerificationCode, verificationErrorMessage } from '@/lib/verification';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = String(body.identifier ?? '').trim().toLowerCase();
    if (!looksLikeEmail(identifier)) return NextResponse.json({ error: 'Düzgün e-poçt ünvanı daxil edin.' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: identifier } });
    if (!user) return NextResponse.json({ error: 'Hesab tapılmadı.' }, { status: 404 });
    if (user.verifiedAt) return NextResponse.json({ error: 'Bu hesab artıq təsdiqlənib.' }, { status: 400 });

    await sendVerificationCode(user.id, identifier, 'EMAIL');
    return NextResponse.json({ ok: true, target: maskIdentifier(identifier, 'EMAIL') });
  } catch (error) {
    console.error('resend verification error', error);
    const message = verificationErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 429 });
  }
}
