import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function requireMailAdmin() {
  const user = await getCurrentUser();
  if (!user) return { response: NextResponse.json({ error:'Authentication required' }, {status:401}), user:null };
  if (!['ADMIN','SUPER_ADMIN'].includes(user.role)) return { response: NextResponse.json({ error:'Bu bölməyə giriş icazəniz yoxdur.' }, {status:403}), user:null };
  return { response:null, user };
}

export function originAllowed(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const host = req.headers.get('host');
  try { return new URL(origin).host === host; } catch { return false; }
}

export function rejectCsrf(req:NextRequest) {
  if (!originAllowed(req)) return NextResponse.json({error:'Sorğu mənbəyi etibarlı deyil.'},{status:403});
  return null;
}

export function friendlyMailError(error: unknown, fallback: string) {
  const code = String((error as any)?.message || '');
  if (code.includes('CONFIG_MISSING')) return 'Mail server konfiqurasiyası tamamlanmayıb.';
  if (code.includes('TIMEOUT') || code.includes('ETIMEDOUT')) return 'Mail serverə qoşulmaq mümkün olmadı. Bir neçə dəqiqə sonra yenidən cəhd edin.';
  if (/LOGIN|AUTH|authentication|invalid credentials/i.test(code)) return 'Mail hesabının giriş məlumatlarını yoxlayın.';
  return fallback;
}
