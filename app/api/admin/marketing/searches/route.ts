import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMarketingAdmin } from '@/lib/marketing/authorization';

export async function GET() {
  try {
    await requireMarketingAdmin();
    const searches = await prisma.leadSearch.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { _count: { select: { researchItems: true } } } });
    return NextResponse.json({ searches });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load searches.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireMarketingAdmin();
    const body = await request.json();
    const targetType = String(body.targetType || 'COMPANY');
    const location = String(body.location || '').trim();
    const description = String(body.description || '').trim();
    const requestedCount = Math.min(250, Math.max(1, Number(body.requestedCount) || 25));
    const requiredFields = Array.isArray(body.requiredFields) ? body.requiredFields.map(String).slice(0, 20) : [];
    const filters = Array.isArray(body.filters) ? body.filters.map(String).slice(0, 20) : [];
    if (!location || !description) return NextResponse.json({ error: 'Location and search description are required.' }, { status: 400 });
    const allowedTargets = ['COMPANY','DOCTOR','CLINIC','BEAUTY_SALON','BEAUTY_CENTER','RESTAURANT','HOTEL','FASHION_BRAND','RETAIL','EVENT_COMPANY','MARKETING_AGENCY','OTHER'];
    if (!allowedTargets.includes(targetType)) return NextResponse.json({ error: 'Invalid target type.' }, { status: 400 });
    const search = await prisma.leadSearch.create({ data: { targetType: targetType as any, location, description, requestedCount, requiredFields: JSON.stringify(requiredFields), filters: JSON.stringify(filters), createdByUserId: user.id } });
    return NextResponse.json({ search }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create search.' }, { status: 500 });
  }
}
