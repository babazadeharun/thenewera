import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { looksLikeEmail, verifyCode } from '@/lib/verification';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = String(body.identifier ?? '').trim().toLowerCase();
    const code = String(body.code ?? '').trim();
    if (!looksLikeEmail(identifier) || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: '6 rəqəmli təsdiq kodunu daxil edin.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: identifier }, include: { client: true, promoter: true } });
    if (!user) return NextResponse.json({ error: 'Hesab tapılmadı.' }, { status: 404 });
    if (user.verifiedAt) return NextResponse.json({ ok: true, alreadyVerified: true, role: user.role });

    const valid = await verifyCode(user.id, identifier, 'EMAIL', code);
    if (!valid) return NextResponse.json({ error: 'Kod yanlışdır, vaxtı bitib və ya artıq istifadə olunub.' }, { status: 400 });

    // Promoter applications are still subject to admin approval; email verification only proves mailbox ownership.
    if (user.role === 'PROMOTER') {
      return NextResponse.json({ ok: true, emailVerified: true, promoterPending: true, role: user.role });
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true, emailVerified: true, user: { id: user.id, email: user.email, role: user.role, client: user.client } });
  } catch (error) {
    console.error('verify error', error);
    return NextResponse.json({ error: 'E-poçtu təsdiqləmək mümkün olmadı.' }, { status: 500 });
  }
}
