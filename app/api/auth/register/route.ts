import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { looksLikeEmail, maskIdentifier, sendVerificationCode, verificationErrorMessage } from '@/lib/verification';

const registrationMailError = 'Email təsdiq kodunu göndərmək mümkün olmadı. Zəhmət olmasa bir neçə dəqiqə sonra yenidən cəhd edin.';

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

    if (!firstName || !lastName || !email || password.length < 8 || !phone || !company || !jobTitle || !industry || !companySize) {
      return NextResponse.json({ error: 'Bütün tələb olunan sahələri doldurun.' }, { status: 400 });
    }
    if (!looksLikeEmail(email)) return NextResponse.json({ error: 'Düzgün e-poçt ünvanı daxil edin.' }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (!existing.verifiedAt) {
        try {
          await sendVerificationCode(existing.id, email, 'EMAIL');
        } catch (error) {
          console.error('registration verification email failed', error instanceof Error ? error.message : 'unknown error');
          return NextResponse.json({ error: verificationErrorMessage(error) }, { status: 503 });
        }
        return NextResponse.json({ ok: true, verificationRequired: true, target: maskIdentifier(email, 'EMAIL'), identifier: email });
      }
      return NextResponse.json({ error: 'Bu email ünvanı artıq qeydiyyatdan keçib.' }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        role: 'CLIENT',
        client: { create: { email, firstName, lastName, phone, company, jobTitle, industry, companySize, country, website: website || null } },
      },
    });

    try {
      await sendVerificationCode(user.id, email, 'EMAIL');
    } catch (sendError) {
      // Keep the unverified account. It can safely request a new code later instead of
      // forcing the customer to recreate the account after a transient mail outage.
      console.error('registration verification email failed', sendError instanceof Error ? sendError.message : 'unknown error');
      return NextResponse.json({ error: verificationErrorMessage(sendError) || registrationMailError }, { status: 503 });
    }

    return NextResponse.json({ ok: true, verificationRequired: true, target: maskIdentifier(email, 'EMAIL'), identifier: email }, { status: 201 });
  } catch (error) {
    console.error('register error', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Hesab yaratmaq mümkün olmadı. Zəhmət olmasa bir neçə dəqiqə sonra yenidən cəhd edin.' }, { status: 500 });
  }
}
