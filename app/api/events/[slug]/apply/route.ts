import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { looksLikeEmail, maskIdentifier, sendVerificationCode } from '@/lib/verification';

const platforms = new Set(['INSTAGRAM','TIKTOK','FACEBOOK','YOUTUBE','TELEGRAM','OTHER']);
const text = (v: unknown) => String(v ?? '').trim();
const nullable = (v: unknown) => text(v) || null;

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event || event.status !== 'APPLICATION_OPEN') {
      return NextResponse.json({ error: 'Bu tədbir üçün müraciət artıq qəbul edilmir.' }, { status: 400 });
    }

    const firstName = text(body.firstName);
    const lastName = text(body.lastName);
    const email = text(body.email).toLowerCase();
    const phone = text(body.phone);
    const password = String(body.password ?? '');

    if (!firstName || !lastName || !email || !phone || password.length < 8) {
      return NextResponse.json({ error: 'Ad, soyad, e-poçt, telefon və minimum 8 simvolluq şifrə tələb olunur.' }, { status: 400 });
    }
    if (!looksLikeEmail(email)) return NextResponse.json({ error: 'Düzgün e-poçt ünvanı daxil edin.' }, { status: 400 });

    const socialAccounts = Array.isArray(body.socialAccounts) ? body.socialAccounts : [];
    const cleanSocials = socialAccounts
      .filter((s: any) => platforms.has(text(s?.platform)))
      .slice(0, 10)
      .map((s: any) => ({
        platform: text(s.platform) as any,
        username: nullable(s.username),
        profileUrl: nullable(s.profileUrl),
        followerCount: text(s.followerCount) ? Math.max(0, Number.parseInt(text(s.followerCount), 10) || 0) : null,
        notes: nullable(s.notes),
      }));

    const existing = await prisma.user.findUnique({ where: { email }, include: { promoter: true } });
    if (existing) {
      if (existing.role !== 'PROMOTER' || !existing.promoter) {
        return NextResponse.json({ error: 'Bu e-poçt artıq New Era hesabına bağlıdır. Mövcud hesabdan istifadə edin.' }, { status: 409 });
      }

      const existingApplication = await prisma.promoterApplication.findUnique({
        where: { promoterId_eventId: { promoterId: existing.promoter.id, eventId: event.id } },
      });
      if (existingApplication) {
        return NextResponse.json({ error: 'Bu tədbir üçün artıq müraciət etmisiniz.' }, { status: 409 });
      }

      await prisma.promoterApplication.create({ data: { promoterId: existing.promoter.id, eventId: event.id, status: 'PENDING' } });

      if (!existing.verifiedAt) {
        try {
          await sendVerificationCode(existing.id, email, 'EMAIL');
        } catch (error) {
          await prisma.promoterApplication.deleteMany({ where: { promoterId: existing.promoter.id, eventId: event.id } }).catch(() => undefined);
          const message = error instanceof Error ? error.message : '';
          return NextResponse.json({ error: message || 'Təsdiq kodunu göndərmək mümkün olmadı.' }, { status: 503 });
        }
        return NextResponse.json({ ok: true, verificationRequired: true, target: maskIdentifier(email, 'EMAIL'), identifier: email, eventSlug: slug }, { status: 201 });
      }

      return NextResponse.json({ ok: true, applicationSubmitted: true }, { status: 201 });
    }

    const user = await prisma.user.create({
      data: { email, phone, passwordHash: hashPassword(password), role: 'PROMOTER' },
    });

    let promoterId = '';
    try {
      const promoter = await prisma.promoter.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          email,
          phone,
          city: nullable(body.city),
          address: nullable(body.address),
          experience: nullable(body.experience),
          previousEventPromotion: nullable(body.previousEventPromotion),
          salesExperience: nullable(body.salesExperience),
          approximateAudience: text(body.approximateAudience) ? Math.max(0, Number.parseInt(text(body.approximateAudience), 10) || 0) : null,
          notes: nullable(body.notes),
          status: 'PENDING',
          socialAccounts: { create: cleanSocials },
        },
      });
      promoterId = promoter.id;
      await prisma.promoterApplication.create({ data: { promoterId, eventId: event.id, status: 'PENDING' } });
      await sendVerificationCode(user.id, email, 'EMAIL');
    } catch (sendError) {
      if (promoterId) {
        await prisma.promoterApplication.deleteMany({ where: { promoterId, eventId: event.id } }).catch(() => undefined);
        await prisma.promoterSocialAccount.deleteMany({ where: { promoterId } }).catch(() => undefined);
        await prisma.promoter.delete({ where: { id: promoterId } }).catch(() => undefined);
      }
      await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      throw sendError;
    }

    return NextResponse.json({ ok: true, verificationRequired: true, target: maskIdentifier(email, 'EMAIL'), identifier: email, eventSlug: slug }, { status: 201 });
  } catch (error) {
    console.error('promoter application error', error);
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json({ error: message || 'Müraciət hazırda göndərilə bilmir. Bir az sonra yenidən cəhd et.' }, { status: 500 });
  }
}
