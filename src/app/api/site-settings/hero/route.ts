import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const DEFAULT_HERO = '/hero-space-4k.png';

export async function GET() {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { id: 'homepage' } });
    return NextResponse.json({ heroImage: setting?.heroImage || DEFAULT_HERO });
  } catch (error) {
    console.error('hero settings get', error);
    return NextResponse.json({ heroImage: DEFAULT_HERO });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  const configuredKey = process.env.ADMIN_PANEL_KEY;
  const providedKey = request.headers.get('x-admin-key');
  const authorizedByRole = !!user && user.role === 'ADMIN';
  const authorizedByKey = !!configuredKey && providedKey === configuredKey;
  if (!authorizedByRole && !authorizedByKey && configuredKey) return NextResponse.json({ error: 'Admin authentication required. Enter the configured Admin key.' }, { status: 403 });
  try {
    const body = await request.json();
    const heroImage = String(body.heroImage ?? '').trim();
    if (!heroImage) return NextResponse.json({ error: 'Hero image is required.' }, { status: 400 });
    if (!heroImage.startsWith('data:image/') && !/^https?:\/\//i.test(heroImage) && !heroImage.startsWith('/')) {
      return NextResponse.json({ error: 'Use an image upload or a valid image URL.' }, { status: 400 });
    }
    if (heroImage.startsWith('data:image/') && heroImage.length > 2_500_000) {
      return NextResponse.json({ error: 'The optimized hero image is too large. Please choose a smaller image.' }, { status: 413 });
    }
    const setting = await prisma.siteSetting.upsert({ where: { id: 'homepage' }, update: { heroImage }, create: { id: 'homepage', heroImage } });
    return NextResponse.json({ ok: true, heroImage: setting.heroImage });
  } catch (error) {
    console.error('hero settings patch', error);
    return NextResponse.json({ error: 'Unable to save the hero image.' }, { status: 500 });
  }
}
