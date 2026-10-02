import { NextResponse } from 'next/server';
import { createSession, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const firstName = String(body.firstName ?? '').trim();
    const lastName = String(body.lastName ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const phone = String(body.phone ?? '').trim();
    const company = String(body.company ?? '').trim();
    const jobTitle = String(body.jobTitle ?? '').trim();
    const industry = String(body.industry ?? '').trim();
    const companySize = String(body.companySize ?? '').trim();
    const country = String(body.country ?? '').trim();
    const website = String(body.website ?? '').trim();

    if (!firstName || !lastName || !email || password.length < 6 || !phone || !company || !jobTitle || !industry || !companySize) {
      return NextResponse.json({ error: 'Please complete all required fields.' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        role: 'CLIENT',
        client: {
          create: { email, firstName, lastName, phone, company, jobTitle, industry, companySize, country, website: website || null },
        },
      },
      include: { client: true },
    });

    await createSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role, client: user.client } }, { status: 201 });
  } catch (error) {
    console.error('register error', error);
    return NextResponse.json({ error: 'Unable to create the account right now.' }, { status: 500 });
  }
}
