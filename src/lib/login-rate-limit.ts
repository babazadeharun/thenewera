import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';

export class LoginRateLimitError extends Error {
  constructor(public retryAfter: number) { super('Çox sayda giriş cəhdi oldu. Bir qədər sonra yenidən cəhd edin.'); }
}
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function limitLogin(request: Request, email: string) {
  // Vercel overwrites this header. Do not trust user-supplied X-Forwarded-For elsewhere.
  const address = process.env.VERCEL === '1'
    ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim().slice(0, 100) || 'unknown'
    : process.env.AUTH_TRUST_PROXY === 'true'
      ? request.headers.get('x-forwarded-for')?.split(',')[0].trim().slice(0, 100) || 'unknown'
      : 'local';
  const limits = [
    { key: digest('ip:' + address), max: 120, minutes: 15 },
    { key: digest('account-ip:' + email + ':' + address), max: 10, minutes: 10 },
    { key: digest('account:' + email), max: 50, minutes: 15 },
  ];
  for (const rule of limits) {

    const [row] = await prisma.$queryRaw<Array<{ attempts: number; retryAfter: number }>>`
      INSERT INTO "AuthRateLimit" ("key", "attempts", "resetAt") VALUES (${rule.key}, 1, CURRENT_TIMESTAMP + CAST(${rule.minutes * 60} AS INTEGER) * INTERVAL '1 second')
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE WHEN "AuthRateLimit"."resetAt" <= CURRENT_TIMESTAMP THEN 1 ELSE LEAST("AuthRateLimit"."attempts" + 1, ${rule.max + 1}) END,
        "resetAt" = CASE WHEN "AuthRateLimit"."resetAt" <= CURRENT_TIMESTAMP THEN EXCLUDED."resetAt" ELSE "AuthRateLimit"."resetAt" END
      RETURNING "attempts", CEIL(EXTRACT(EPOCH FROM ("resetAt" - CURRENT_TIMESTAMP)))::INTEGER AS "retryAfter"`;
    if (row.attempts > rule.max) throw new LoginRateLimitError(Math.max(row.retryAfter, 1));
  }
}
