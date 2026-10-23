import { handled, json, bytes } from "@/lib/crm/http";
import { fail } from "@/lib/crm/policy";
import { receiveForm } from "@/lib/crm/intake";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(r: Request, p: { params: Promise<{ id: string }> }) {
  return handled(async () => {
    let b: Record<string, unknown>;
    try { b = JSON.parse((await bytes(r, 32768)).toString()); } catch (e) { if (e instanceof Error && "status" in e) throw e; fail("JSON düzgün deyil."); }
    if (!b || typeof b !== "object" || Array.isArray(b)) fail("JSON düzgün deyil.");
    const authorization = r.headers.get("authorization") || "";
    return json(await receiveForm((await p.params).id, authorization.startsWith("Bearer ") ? authorization.slice(7) : "", b));
  });
}
