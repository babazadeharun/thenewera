import { pdf } from "@/lib/crm/files";
import { actor } from "@/lib/crm/db";
import { portal, portalFile } from "@/lib/crm/portal";
import { body, bytes, origin, handled, json } from "@/lib/crm/http";
import { fail } from "@/lib/crm/policy";
export const dynamic = "force-dynamic";
export async function GET(r: Request) {
  return handled(async () => {
    const u = await actor();
    if (!u) fail("Daxil olun.", 401);
    const q = new URL(r.url).searchParams;
    if (q.get("fileId")) {
      const result = await portalFile(u, q);
      return new Response(new Uint8Array(result.file!.bytes), {
        headers: {
          "Content-Type": result.file!.mime,
          "Content-Disposition":
            "attachment; filename*=UTF-8''" +
            encodeURIComponent(result.file!.name),
          "Cache-Control": "private, no-store",
          "Content-Security-Policy": "default-src 'none'; sandbox",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    const result = await portal(u, undefined, q);
    if (q.get("pdfId")) {
      const data = result as any,
        e = data.records?.find(
          (e: any) => e.id === q.get("pdfId") && e.kind === "quotes",
        );
      if (!e) fail("Təklif tapılmadı.", 404);
      return new Response(await pdf(data.company.name, e), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="proposal.pdf"',
          "Cache-Control": "private, no-store",
        },
      });
    }
    return json(result);
  });
}
export async function POST(r: Request) {
  return handled(async () => {
    const u = await actor();
    if (!u) fail("Daxil olun.", 401);
    const q = new URL(r.url).searchParams;
    if (q.get("upload")) {
      origin(r);
      const result = await portalFile(u, q, {
        bytes: await bytes(r, 10485760),
        mime: r.headers.get("content-type") || "",
        name: decodeURIComponent(r.headers.get("x-filename") || "file"),
      });
      return json(result.created);
    }
    const b = await body(r);
    return json(await portal(u, b));
  });
}
