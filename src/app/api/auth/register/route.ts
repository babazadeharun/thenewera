import { NextResponse } from 'next/server';
import { createSession, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { looksLikeEmail, looksLikePhone, maskIdentifier, normalizePhone, sendVerificationCode } from '@/lib/verification';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const firstName = String(body.firstName ?? '').trim();
    const lastName = String(body.lastName ?? '').trim();
    const emailInput = String(body.email ?? '').trim().toLowerCase();
    const phoneInput = String(body.phone ?? '').trim();
    const method = body.verificationMethod === 'phone' ? 'phone' : 'email';
    const password = String(body.password ?? '');
    const company = String(body.company ?? '').trim();
    const jobTitle = String(body.jobTitle ?? '').trim();
    const industry = String(body.industry ?? '').trim();
    const companySize = String(body.companySize ?? '').trim();
    const country = String(body.country ?? '').trim();
    const website = String(body.website ?? '').trim();

    const email = emailInput || null;
    const phone = phoneInput ? normalizePhone(phoneInput) : null;
    const identifier = method === 'phone' ? phone : email;
    if (!firstName || !lastName || password.length < 8 || !company || !jobTitle || !industry || !companySize || !identifier) {
      return NextResponse.json({ error: 'Please complete all required fields.' }, { status: 400 });
    }
    if (method === 'email' && !email || method === 'phone' && !phone) {
      return NextResponse.json({ error: method === 'email' ? 'Enter a valid email address.' : 'Enter a valid phone number in international format, e.g. +994501234567.' }, { status: 400 });
    }
    if (method === 'email' && !looksLikeEmail(email!)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    if (method === 'phone' && !looksLikePhone(phone!)) return NextResponse.json({ error: 'Enter a valid phone number in international format, e.g. +994501234567.' }, { status: 400 });

    const existing = await prisma.user.findFirst({ where: { OR: [email ? { email } : undefined, phone ? { phone } : undefined].filter(Boolean) as any[] } });
    if (existing) {
      if (!existing.verifiedAt) {
        const channel = existing.phone === identifier ? 'PHONE' : 'EMAIL';
        await sendVerificationCode(existing.id, identifier, channel);
        return NextResponse.json({ ok: true, verificationRequired: true, channel: channel.toLowerCase(), target: maskIdentifier(identifier, channel), identifier });
      }
      return NextResponse.json({ error: 'An account with this email or phone number already exists.' }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email: method === 'email' ? email : null,
        phone: method === 'phone' ? phone : null,
        passwordHash: hashPassword(password),
        role: 'CLIENT',
        client: {
          create: { email: method === 'email' ? email : null, phone: method === 'phone' ? phone : null, firstName, lastName, company, jobTitle, industry, companySize, country, website: website || null },
        },
      },
      include: { client: true },
    });

    try {
      const channel = method === 'phone' ? 'PHONE' : 'EMAIL';
      await sendVerificationCode(user.id, identifier, channel);
    } catch (sendError) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      throw sendError;
    }

    return NextResponse.json({ ok: true, verificationRequired: true, channel: method, target: maskIdentifier(identifier, method === 'phone' ? 'PHONE' : 'EMAIL'), identifier }, { status: 201 });
  } catch (error) {
    console.error('register error', error);
    const message = error instanceof Error && error.message.includes('verification is not configured') ? error.message : 'Unable to create the account right now.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
