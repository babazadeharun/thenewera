import { createHmac, timingSafeEqual } from "node:crypto";
import { bytes } from "@/lib/crm/http";
import { encrypt, decrypt } from "@/lib/crm/security";
import { offerOrigin, reject, sha } from "./offer-policy";
export { encrypt, decrypt };
export class InstagramProviderError extends Error {
  constructor(
    public kind: "REJECTED" | "UNCERTAIN",
    public reconnect = false,
  ) {
    super(kind);
  }
}
export function instagramConfig(strict = true) {
  const appId = process.env.SALES_INSTAGRAM_APP_ID || "",
    appSecret = process.env.SALES_INSTAGRAM_APP_SECRET || "",
    version =
      process.env.SALES_INSTAGRAM_GRAPH_VERSION ||
      process.env.CRM_META_GRAPH_VERSION ||
      "",
    verifyToken = process.env.SALES_INSTAGRAM_WEBHOOK_VERIFY_TOKEN || "";
  const missing: string[] = [];
  if (!/^\d{1,80}$/.test(appId)) missing.push("SALES_INSTAGRAM_APP_ID");
  if (!appSecret) missing.push("SALES_INSTAGRAM_APP_SECRET");
  if (!/^v\d+\.\d+$/.test(version))
    missing.push("SALES_INSTAGRAM_GRAPH_VERSION");
  if (verifyToken.length < 32)
    missing.push("SALES_INSTAGRAM_WEBHOOK_VERIFY_TOKEN");
  if (appId && appId === process.env.CRM_INSTAGRAM_APP_ID)
    missing.push("PLATFORM_APP_MUST_BE_SEPARATE");
  try {
    encrypt("configuration-check");
  } catch {
    missing.push("CRM_ENCRYPTION_KEY");
  }
  let origin = "";
  try {
    origin = offerOrigin();
  } catch {
    missing.push("SALES_OFFER_APP_URL");
  }
  if (strict && missing.length)
    reject("Admin Instagram bağlantısının server ayarları tamamlanmayıb.", 503);
  return {
    configHash: sha(JSON.stringify([appId, sha(appSecret), version, origin])),
    appId,
    appSecret,
    version,
    verifyToken,
    origin,
    callback: origin + "/api/sales-instagram/callback",
    configured: missing.length === 0,
    missing,
  };
}
export function graph(path: string) {
  return `https://graph.instagram.com/${instagramConfig().version}/${path}`;
}
export async function igJSON(
  url: string,
  token?: string,
  init: RequestInit = {},
) {
  let r: Response, data: any;
  try {
    r = await fetch(url, {
      ...init,
      redirect: "error",
      headers: {
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...init.headers,
      },
      signal: AbortSignal.timeout(8000),
    });
    data = JSON.parse(
      (await bytes(r as unknown as Request, 1048576)).toString(),
    );
  } catch {
    throw new InstagramProviderError("UNCERTAIN");
  }
  if (!r.ok || data.error)
    throw new InstagramProviderError(
      r.status >= 400 && r.status < 500 ? "REJECTED" : "UNCERTAIN",
      [401, 403].includes(r.status) || data.error?.code === 190,
    );
  return data;
}
export const form = (b: Record<string, string>) => ({
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(b),
});
export async function exchangeInstagram(code: string) {
  const c = instagramConfig();
  const body = new FormData();
  Object.entries({
    client_id: c.appId,
    client_secret: c.appSecret,
    grant_type: "authorization_code",
    redirect_uri: c.callback,
    code,
  }).forEach(([k, v]) => body.set(k, v));
  const short = await igJSON(
    "https://api.instagram.com/oauth/access_token",
    undefined,
    { method: "POST", body },
  );
  const shortToken = short.access_token || short.data?.[0]?.access_token;
  if (typeof shortToken !== "string")
    reject("Instagram icazəsi alınmadı. Yenidən qoşun.", 503);
  const u = new URL("https://graph.instagram.com/access_token");
  u.search = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: c.appSecret,
    access_token: shortToken,
  }).toString();
  const longer = await igJSON(u.toString());
  if (
    typeof longer.access_token !== "string" ||
    !Number.isFinite(Number(longer.expires_in)) ||
    Number(longer.expires_in) <= 0
  )
    reject("Instagram tokeni yoxlanmadı.", 503);
  const profile = await igJSON(
      graph("me?fields=user_id,username"),
      longer.access_token,
    ),
    externalId = String(profile.user_id || profile.id || "");
  if (!/^\d{1,80}$/.test(externalId))
    reject("Uyğun Instagram Professional hesabı tapılmadı.", 503);
  return {
    accessToken: longer.access_token,
    externalId,
    subjectId: String(
      short.user_id || short.data?.[0]?.user_id || profile.id || externalId,
    ),
    displayName: "@" + String(profile.username || externalId).slice(0, 150),
    expiresAt: new Date(
      Date.now() + Math.min(Number(longer.expires_in), 90 * 86400) * 1000,
    ),
  };
}
export const sign = (data: string | Buffer, secret: string) =>
  createHmac("sha256", secret).update(data).digest("hex");
export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
