import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { looksLikeEmail } from '@/lib/verification';
import { prisma } from '@/lib/prisma';

const adminOnly = async () => {
  const user = await getCurrentUser();
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null;
  return user;
};

const clean = (value: unknown) => {
  const text = String(value ?? '').trim();
  return text || null;
};

const validWebsite = (value: string | null) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

function serializeClient(client: any) {
  return {
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    phone: client.phone,
    company: client.company,
    jobTitle: client.jobTitle,
    industry: client.industry,
    companySize: client.companySize,
    country: client.country,
    website: client.website,
    instagram: client.instagram,
    createdAt: client.createdAt?.toISOString?.() ?? client.createdAt,
  };
}

export async function GET(req: NextRequest) {
  const user = await adminOnly();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (id) {
      const client = await prisma.client.findUnique({ where: { id } });
      if (!client) return NextResponse.json({ error: 'Müştəri tapılmadı.' }, { status: 404 });
      return NextResponse.json({ client: serializeClient(client) });
    }
    const clients = await prisma.client.findMany({ orderBy: [{ company: 'asc' }, { firstName: 'asc' }], });
    return NextResponse.json({ clients: clients.map(serializeClient) });
  } catch (error) {
    console.error('admin clients GET', error);
    return NextResponse.json({ error: 'Müştəri məlumatlarını yükləmək mümkün olmadı.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await adminOnly();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const body = await req.json();
    const firstName = String(body.firstName ?? '').trim();
    const lastName = String(body.lastName ?? '').trim();
    const email = clean(body.email)?.toLowerCase() ?? null;
    const phone = clean(body.phone);
    const company = clean(body.company);
    const jobTitle = clean(body.jobTitle);
    const industry = clean(body.industry);
    const companySize = clean(body.companySize);
    const country = clean(body.country);
    const website = clean(body.website);
    const instagram = clean(body.instagram);

    if (!firstName || !lastName) return NextResponse.json({ error: 'Ad və soyad tələb olunur.' }, { status: 400 });
    if (email && !looksLikeEmail(email)) return NextResponse.json({ error: 'Düzgün e-poçt ünvanı daxil edin.' }, { status: 400 });
    if (!validWebsite(website)) return NextResponse.json({ error: 'Website düzgün URL formatında olmalıdır. Məsələn: https://company.az' }, { status: 400 });

    const client = await prisma.client.create({
      data: { firstName, lastName, email, phone, company, jobTitle, industry, companySize, country, website, instagram },
    });
    return NextResponse.json({ client: serializeClient(client) }, { status: 201 });
  } catch (error: any) {
    console.error('admin clients POST', error);
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Bu e-poçt və ya telefon artıq başqa müştəriyə məxsusdur.' }, { status: 409 });
    return NextResponse.json({ error: 'Müştəri yaratmaq mümkün olmadı.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await adminOnly();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const body = await req.json();
    const id = String(body.id ?? '').trim();
    if (!id) return NextResponse.json({ error: 'Müştəri ID tələb olunur.' }, { status: 400 });
    const data: any = {};
    for (const key of ['firstName', 'lastName', 'company', 'jobTitle', 'industry', 'companySize', 'country', 'phone', 'website', 'instagram']) {
      if (key in body) data[key] = clean(body[key]);
    }
    if ('email' in body) data.email = clean(body.email)?.toLowerCase() ?? null;
    if (('firstName' in body && !data.firstName) || ('lastName' in body && !data.lastName)) {
      return NextResponse.json({ error: 'Ad və soyad boş ola bilməz.' }, { status: 400 });
    }
    if ('email' in body && data.email && !looksLikeEmail(data.email)) {
      return NextResponse.json({ error: 'Düzgün e-poçt ünvanı daxil edin.' }, { status: 400 });
    }
    if ('website' in body && !validWebsite(data.website)) {
      return NextResponse.json({ error: 'Website düzgün URL formatında olmalıdır. Məsələn: https://company.az' }, { status: 400 });
    }
    const client = await prisma.client.update({ where: { id }, data });
    return NextResponse.json({ client: serializeClient(client) });
  } catch (error: any) {
    console.error('admin clients PATCH', error);
    if (error?.code === 'P2025') return NextResponse.json({ error: 'Müştəri tapılmadı.' }, { status: 404 });
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Bu e-poçt və ya telefon artıq başqa müştəriyə məxsusdur.' }, { status: 409 });
    return NextResponse.json({ error: 'Müştəri yenilənə bilmədi.' }, { status: 500 });
  }
}
