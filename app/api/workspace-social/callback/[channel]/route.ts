import { randomBytes } from "node:crypto";
import { actor } from "@/lib/crm/db";
import { socialCallback } from "@/lib/crm/social";
import { socialChannel } from "@/lib/crm/social-api";
import { handled } from "@/lib/crm/http";
import { appOrigin } from "@/lib/crm/mail";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(
  r: Request,
  p: { params: Promise<{ channel: string }> },
) {
  return handled(async () => {
    const u = await actor(),
      q = new URL(r.url).searchParams,
      channel = socialChannel((await p.params).channel.toUpperCase());
    const result = await socialCallback(
      u,
      channel,
      q.get("state") || "",
      q.get("code") || "",
      q.has("error"),
    );
    const origin = appOrigin(),
      path =
        "/workspace/" +
        result.companyId +
        "?section=settings&social_auth=" +
        result.authId,
      nonce = randomBytes(16).toString("base64");
    const message = JSON.stringify({
      type: "NEW_ERA_SOCIAL_AUTH",
      ...result,
    }).replace(/</g, "\\u003c");
    const script = `if(window.opener){window.opener.postMessage(${message},${JSON.stringify(origin)});window.close();}document.getElementById('back').href=${JSON.stringify(origin + path)};`;
    return new Response(
      `<!doctype html><html lang="az"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEW ERA — hesab bağlantısı</title><body><h1>Hesab icazəsi yoxlandı</h1><p>Workspace-ə qayıdıb qoşulacaq hesabı seçin və təsdiqləyin.</p><a id="back" href="${origin + path}">Workspace-ə qayıt</a><script nonce="${nonce}">${script}</script></body></html>`,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'`,
        },
      },
    );
  });
}
