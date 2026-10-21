import { instagramAdmin, igHandled, igBody, igResponse } from '@/lib/sales/instagram-http';
import { prospectList, prospectDetail, prospectChange, prospectOfferLink } from '@/lib/sales/prospecting';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = (r: Request) => igHandled(async () => {
  await instagramAdmin();
  const q = new URL(r.url).searchParams;
  return igResponse(q.has('id') ? await prospectDetail(q.get('id')!) : await prospectList(q));
});
export const POST = (r: Request) => igHandled(async () => {
  const user = await instagramAdmin(), b = await igBody(r);
  return igResponse(b.action === 'offer-link' ? await prospectOfferLink(b) : await prospectChange(user.id, b));
});
