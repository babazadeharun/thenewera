import { timingSafeEqual } from 'node:crypto';
import { handled,json } from '@/lib/crm/http';
import { fail } from '@/lib/crm/policy';
import { jobs } from '@/lib/crm/jobs';
export const dynamic='force-dynamic';export const maxDuration=60;
export async function GET(r:Request){return handled(async()=>{const secret=process.env.CRM_CRON_SECRET||process.env.CRON_SECRET;if(!secret)fail('Cron qoşulmayıb.',503);const a=Buffer.from(r.headers.get('authorization')||''),b=Buffer.from('Bearer '+secret);if(a.length!==b.length||!timingSafeEqual(a,b))fail('İcazə yoxdur.',403);return json(await jobs());});}
