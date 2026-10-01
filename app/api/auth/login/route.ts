import { NextResponse } from 'next/server';
import { createSession, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    if (!email || !password) return NextResponse.json({ error: 'E-poçt və şifrə tələb olunur.' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email }, include: { client: true } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'E-poçt və ya şifrə yanlışdır.' }, { status: 401 });
    }
    if (user.role === 'PROMOTER') {
      const promoter = await prisma.promoter.findUnique({ where: { userId: user.id }, select: { status: true } });
      if (!promoter || promoter.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Promoter hesabın hələ aktiv deyil. Müraciətin təsdiqləndikdən sonra giriş edə biləcəksən.' }, { status: 403 });
      }
    }
    await createSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role, client: user.client } });
  } catch (error) {
    console.error('login error', error);
    return NextResponse.json({ error: 'Unable to log in right now.' }, { status: 500 });
  }
}
