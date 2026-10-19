import { ensureSecondFactor } from "@/lib/crm/security";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slots, book } from "@/lib/crm/booking";
import { body, handled, json } from "@/lib/crm/http";
import { fail } from "@/lib/crm/policy";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ slug: string }> };
export async function GET(r: Request, p: P) {
  return handled(async () => {
    const { slug } = await p.params,
      q = new URL(r.url).searchParams;
    if (q.get("mine")) {
      const u = await getCurrentUser();
      if (!u) fail("Daxil olun.", 401);
      await ensureSecondFactor(u.id);
      return json(
        await prisma.crmBooking.findMany({
          where: { userId: u.id, schedule: { slug } },
          orderBy: { startsAt: "desc" },
          take: 50,
          select: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            timezone: true,
            status: true,
          },
        }),
      );
    }
    return json(
      await slots(
        prisma,
        slug,
        q.get("day") || new Date().toISOString().slice(0, 10),
      ),
    );
  });
}
export async function POST(r: Request, p: P) {
  return handled(async () => {
    const b = await body(r),
      u = await getCurrentUser();
    if (!u) fail("Daxil olun.", 401);
    await ensureSecondFactor(u.id);
    return json(await book(u, (await p.params).slug, b));
  });
}
