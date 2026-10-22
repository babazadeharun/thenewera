import { limitLogin, LoginRateLimitError } from '@/lib/login-rate-limit';
import { bytes } from '@/lib/crm/http';
import { NextResponse } from 'next/server';
import { createSession, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { looksLikeEmail, maskIdentifier, sendVerificationCode, verificationErrorMessage } from '@/lib/verification';

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Sorğu mənbəyi uyğun deyil.' }, { status: 403 });
    let body;
    try { body = JSON.parse((await bytes(request, 16384)).toString()); }
    catch { return NextResponse.json({ error: 'Sorğu düzgün deyil və ya çox böyükdür.' }, { status: 400 }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Sorğu düzgün deyil.' }, { status: 400 });
    const email = String(body.email ?? body.identifier ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    if (!email || !password) return NextResponse.json({ error: 'E-poçt və şifrə tələb olunur.' }, { status: 400 });
    if (!looksLikeEmail(email)) return NextResponse.json({ error: 'E-poçt və ya şifrə yanlışdır.' }, { status: 401 });

    if (email.length > 254 || password.length > 500) return NextResponse.json({ error: 'E-poçt və ya şifrə düzgün deyil.' }, { status: 400 });
    await limitLogin(request, email);

    const user = await prisma.user.findUnique({ where: { email }, include: { client: true } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'E-poçt və ya şifrə yanlışdır.' }, { status: 401 });
    }

    // Existing internal/admin accounts may predate email verification. Public accounts must verify first.
    const publicRole = user.role === 'CLIENT' || user.role === 'PROMOTER';
    if (publicRole && !user.verifiedAt) {
      try {
        await sendVerificationCode(user.id, email, 'EMAIL');
      } catch (error) {
        const message = verificationErrorMessage(error);
        return NextResponse.json({ error: message }, { status: 503 });
      }
      return NextResponse.json({ error: 'Daxil olmaq üçün əvvəlcə e-poçtunuzu təsdiqləyin.', verificationRequired: true, target: maskIdentifier(email, 'EMAIL'), identifier: email }, { status: 403 });
    }

    if (user.role === 'CLIENT' && ['SUSPENDED', 'ARCHIVED'].includes(user.accountStatus)) {
      return NextResponse.json({ error: user.accountStatus === 'SUSPENDED' ? 'Hesabınız hazırda dayandırılıb. New Era komandası ilə əlaqə saxlayın.' : 'Bu hesab artıq aktiv deyil. New Era komandası ilə əlaqə saxlayın.' }, { status: 403 });
    }

    if (user.role === 'PROMOTER') {
      const promoter = await prisma.promoter.findUnique({ where: { userId: user.id }, select: { status: true } });
      if (!promoter || promoter.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Promoter hesabın hələ aktiv deyil. Müraciətin təsdiqləndikdən sonra giriş edə biləcəksən.' }, { status: 403 });
      }
    }

    await createSession(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await prisma.auditLog.create({ data: { event: 'LOGIN', actorId: user.id, targetUserId: user.id } }).catch(() => undefined);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role, accountStatus: user.accountStatus, accountType: user.accountType, client: user.client } });
  } catch (error) {
    if (error instanceof LoginRateLimitError) return NextResponse.json({ error: error.message }, { status: 429, headers: { 'Retry-After': String(error.retryAfter), 'Cache-Control': 'no-store' } });
    console.error('login error', error);
    return NextResponse.json({ error: 'Hazırda giriş etmək mümkün deyil.' }, { status: 500 });
  }
}
