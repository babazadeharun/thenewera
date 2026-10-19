import { actor } from "@/lib/crm/db";
import { callback } from "@/lib/crm/connections";
import { handled } from "@/lib/crm/http";
export const dynamic = "force-dynamic";
export async function GET(
  r: Request,
  p: { params: Promise<{ provider: string }> },
) {
  return handled(async () => {
    const u = await actor(),
      q = new URL(r.url).searchParams,
      path = await callback(
        u,
        (await p.params).provider,
        q.get("state") || "",
        q.get("code") || "",
      );
    return Response.redirect(new URL(path, r.url), 303);
  });
}
