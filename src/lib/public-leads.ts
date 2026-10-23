import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
export class LeadError extends Error { constructor(public status: number, message: string, public retryAfter = 0) { super(message); } }
export const needs = {
  acquisition: 'Daha çox uyğun müştəri istəyirəm',
  conversion: 'Müraciətlərimi satışa çevirmək istəyirəm',
  management: 'Komandamı və işlərimi idarə etmək istəyirəm',
  other: 'Digər ehtiyac',
} as const;
export function validateLead(b: Record<string, unknown>) {
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const contact = typeof b.contact === 'string' ? b.contact.trim() : '';
  const need = typeof b.need === 'string' && Object.hasOwn(needs, b.need) ? b.need as keyof typeof needs : null;
  if (name.length < 2 || name.length > 100 || /[\r\n\x00]/.test(name)) throw new LeadError(400, 'Adınızı daxil edin (2–100 simvol).');
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const isPhone = /^[+()\d\s-]+$/.test(contact) && contact.replace(/\D/g, '').length >= 9 && contact.replace(/\D/g, '').length <= 15;
  if (contact.length > 254 || (!isEmail && !isPhone)) throw new LeadError(400, 'Düzgün e-poçt və ya ölkə kodu ilə telefon nömrəsi daxil edin.');
  if (!need || b.consent !== true) throw new LeadError(400, 'Ehtiyacınızı seçin və əlaqə üçün razılıq verin.');
  if (typeof b.requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(b.requestId)) throw new LeadError(400, 'Səhifəni yeniləyib yenidən cəhd edin.');
  return { name, contact: isEmail ? contact.toLowerCase() : contact.replace(/[^+\d]/g,''), isEmail, need, requestId: b.requestId };
}
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export async function submitLead(request: Request, b: Record<string, unknown>) {
  const lead = validateLead(b);
  const address = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim().slice(0,100) || 'unknown'
    : process.env.AUTH_TRUST_PROXY === 'true' ? request.headers.get('x-forwarded-for')?.split(',')[0].trim().slice(0,100) || 'unknown' : 'local';
  for (const rule of [{key: 'ip:' + address, max: 20}, {key: 'contact:' + lead.contact, max: 5}]) {
    const key = hash('public-lead:' + rule.key);
    const [row] = await prisma.$queryRaw<Array<{attempts:number; retryAfter:number}>>`
      INSERT INTO "AuthRateLimit" ("key","attempts","resetAt") VALUES (${key},1,CURRENT_TIMESTAMP + INTERVAL '15 minutes')
      ON CONFLICT ("key") DO UPDATE SET "attempts"=CASE WHEN "AuthRateLimit"."resetAt" <= CURRENT_TIMESTAMP THEN 1 ELSE LEAST("AuthRateLimit"."attempts"+1,${rule.max+1}) END,
      "resetAt"=CASE WHEN "AuthRateLimit"."resetAt" <= CURRENT_TIMESTAMP THEN EXCLUDED."resetAt" ELSE "AuthRateLimit"."resetAt" END
      RETURNING "attempts", CEIL(EXTRACT(EPOCH FROM ("resetAt"-CURRENT_TIMESTAMP)))::INTEGER AS "retryAfter"`;
    if (row.attempts > rule.max) throw new LeadError(429, 'Çox sayda müraciət göndərilib. Bir qədər sonra yenidən cəhd edin.', Math.max(1,row.retryAfter));
  }
  // A stable, unguessable request ID makes retrying a lost response safe.
  const id = 'web_' + hash(lead.requestId);
  const notes = 'Ehtiyac: ' + needs[lead.need] + '\nMənbə: Qısa veb müraciəti. Əlaqə üçün razılıq verilib.';
  await prisma.$transaction(async db => {
    await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))::text`;
    const existing = await db.salesDeal.findUnique({where:{id}});
    if (existing) {
      if (existing.contactName !== lead.name || existing.email !== (lead.isEmail ? lead.contact : null) || existing.phone !== (lead.isEmail ? null : lead.contact) || existing.notes !== notes)
        throw new LeadError(409,'Müraciət məlumatı dəyişib. Səhifəni yeniləyib yenidən göndərin.');
      return;
    }
    await db.salesDeal.create({data:{id,title: 'Veb müraciəti · ' + lead.name, contactName:lead.name, email:lead.isEmail ? lead.contact : null, phone:lead.isEmail ? null : lead.contact, source:'WEBSITE_QUICK_REQUEST',stage:'NEW',probability:0,notes}});
    const admins = await db.user.findMany({where:{role:{in:['ADMIN','SUPER_ADMIN']},accountStatus:{notIn:['SUSPENDED','ARCHIVED']}},select:{id:true}});
    if (admins.length) await db.customerNotification.createMany({data:admins.map(a=>({userId:a.id,type:'WEB_LEAD',title:'Yeni veb müraciəti',message:lead.name + ' · ' + needs[lead.need],link:'/admin?section=sales'}))});
  });
  return { ok:true, reference:id.slice(4,16).toUpperCase() };
}
