import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { looksLikeEmail, maskIdentifier, sendVerificationCode, verificationErrorMessage } from '@/lib/verification';
import { createWorkspaceForUser } from '@/lib/workspace';

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

    const requiredFields = [
      [firstName, 'Adınızı daxil edin.'],
      [lastName, 'Soyadınızı daxil edin.'],
      [email, 'E-poçt ünvanınızı daxil edin.'],
      [phone, 'Telefon nömrənizi daxil edin.'],
      [company, 'Şirkətin adını daxil edin.'],
      [jobTitle, 'Vəzifənizi daxil edin.'],
      [industry, 'Fəaliyyət sahəsini seçin.'],
      [companySize, 'Şirkətin ölçüsünü seçin.'],
    ];

    for (const [value, message] of requiredFields) {
      if (!value) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    if (!looksLikeEmail(email)) {
      return NextResponse.json(
        { error: 'Düzgün e-poçt ünvanı daxil edin.' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Şifrənizi daxil edin.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Şifrə ən azı 8 simvoldan ibarət olmalıdır.' },
        { status: 400 }
      );
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (!existing.verifiedAt) {
        try {
          if (existing.clientId) { const ws = await prisma.workspace.findUnique({ where: { clientId: existing.clientId } }); if (!ws) { const c = await prisma.client.findUnique({ where: { id: existing.clientId } }); if (c) await createWorkspaceForUser(existing.id, c.id, c.company || `${c.firstName} ${c.lastName} — New Era`, c.company ? 'BUSINESS' : 'INDIVIDUAL'); } }
          await sendVerificationCode(existing.id, email, 'EMAIL');
        } catch (error) {
          console.error('registration verification email failed', error instanceof Error ? error.message : 'unknown error');
          return NextResponse.json({ error: verificationErrorMessage(error) }, { status: 503 });
        }
        return NextResponse.json({ ok: true, verificationRequired: true, target: maskIdentifier(email, 'EMAIL'), identifier: email });
      }
      return NextResponse.json({ error: 'Bu e-poçt ünvanı ilə artıq qeydiyyatdan keçmisiniz.' }, { status: 409 });
    }

    const existingPhoneUser = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    const existingPhoneClient = await prisma.client.findFirst({
      where: { phone },
      select: { id: true },
    });

    if (existingPhoneUser || existingPhoneClient) {
      return NextResponse.json(
        { error: 'Bu telefon nömrəsi ilə artıq hesab mövcuddur.' },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        role: 'CLIENT',
        accountStatus: 'REGISTERED',
        accountType: company ? 'BUSINESS' : 'INDIVIDUAL',
        client: { create: { email, firstName, lastName, phone, company, jobTitle, industry, companySize, country, website: website || null } },
      },
      include: { client: true },
    });
    if (user.client) {
      await createWorkspaceForUser(user.id, user.client.id, company || `${firstName} ${lastName} — New Era`, company ? 'BUSINESS' : 'INDIVIDUAL');
    }
    await prisma.auditLog.create({ data: { event: 'USER_REGISTERED', targetUserId: user.id, newValue: 'REGISTERED', metadata: { email } } });

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
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      const meta = 'meta' in error
        ? error.meta as { target?: unknown } | undefined
        : undefined;
      const target = JSON.stringify(meta?.target ?? '').toLowerCase();

      const message = target.includes('phone')
        ? 'Bu telefon nömrəsi ilə artıq hesab mövcuddur.'
        : target.includes('email')
          ? 'Bu e-poçt ünvanı ilə artıq qeydiyyatdan keçmisiniz.'
          : 'Daxil etdiyiniz məlumatlarla artıq hesab mövcuddur. E-poçt və telefon nömrənizi yoxlayın.';

      return NextResponse.json({ error: message }, { status: 409 });
    }

    console.error('register error', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Hesab yaratmaq mümkün olmadı. Zəhmət olmasa bir neçə dəqiqə sonra yenidən cəhd edin.' }, { status: 500 });
  }
}
