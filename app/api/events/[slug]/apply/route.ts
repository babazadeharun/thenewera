import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const platforms = new Set(['INSTAGRAM','TIKTOK','FACEBOOK','YOUTUBE','TELEGRAM','OTHER']);
function text(v: unknown) { return String(v ?? '').trim(); }
function nullable(v: unknown) { const x=text(v); return x || null; }

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event || event.status !== 'APPLICATION_OPEN') return NextResponse.json({ error: 'Bu tədbir üçün müraciət artıq qəbul edilmir.' }, { status: 400 });

    const firstName=text(body.firstName), lastName=text(body.lastName), email=text(body.email).toLowerCase(), phone=text(body.phone), password=String(body.password ?? '');
    if (!firstName || !lastName || !email || !phone || password.length < 8) return NextResponse.json({ error: 'Ad, soyad, e-poçt, telefon və minimum 8 simvolluq şifrə tələb olunur.' }, { status:400 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'E-poçt ünvanı düzgün deyil.' }, { status:400 });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: 'Bu e-poçt artıq sistemdə qeydiyyatlıdır. Mövcud hesabla bağlı müraciət üçün New Era ilə əlaqə saxla.' }, { status:409 });

    const socialAccounts = Array.isArray(body.socialAccounts) ? body.socialAccounts : [];
    const cleanSocials = socialAccounts.filter((s: any) => platforms.has(text(s?.platform))).slice(0, 10).map((s: any) => ({ platform: text(s.platform) as any, username: nullable(s.username), profileUrl: nullable(s.profileUrl), followerCount: text(s.followerCount) ? Math.max(0, Number.parseInt(text(s.followerCount),10) || 0) : null, notes: nullable(s.notes) }));

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email, phone, passwordHash: hashPassword(password), role: 'PROMOTER' } });
      const promoter = await tx.promoter.create({ data: { userId:user.id, firstName, lastName, email, phone, city:nullable(body.city), address:nullable(body.address), experience:nullable(body.experience), previousEventPromotion:nullable(body.previousEventPromotion), salesExperience:nullable(body.salesExperience), approximateAudience: text(body.approximateAudience) ? Math.max(0, Number.parseInt(text(body.approximateAudience),10) || 0) : null, notes:nullable(body.notes), status:'PENDING', socialAccounts:{ create: cleanSocials } } });
      await tx.promoterApplication.create({ data:{ promoterId:promoter.id, eventId:event.id, status:'PENDING' } });
    });
    return NextResponse.json({ ok:true }, { status:201 });
  } catch (error) {
    console.error('promoter application error', error);
    return NextResponse.json({ error:'Müraciət hazırda göndərilə bilmir. Bir az sonra yenidən cəhd et.' }, { status:500 });
  }
}
