import { bytes } from "./http";
import { appOrigin } from "./mail";
import { fail } from "./policy";
export const socialChannels = ["INSTAGRAM", "MESSENGER", "WHATSAPP"] as const;
export type SocialChannel = (typeof socialChannels)[number];
export type SocialChoice = {
  id: string;
  name: string;
  token?: string;
  parentId?: string;
  requiresPin?: boolean;
  status?: string;
};
export type SocialSecret = {
  accessToken: string;
  expiresAt: number | null;
  issuedAt: number;
  subjectId?: string;
  choices?: SocialChoice[];
};
export class SocialError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export const socialName = (channel: string) =>
  ({
    INSTAGRAM: "Instagram",
    MESSENGER: "Facebook Messenger",
    WHATSAPP: "WhatsApp Business",
  })[channel] || channel;
export function socialChannel(value: unknown): SocialChannel {
  if (!socialChannels.includes(value as SocialChannel))
    fail("Kanal düzgün deyil.");
  return value as SocialChannel;
}
export function socialConfig(channel: SocialChannel, strict = true) {
  const instagram = channel === "INSTAGRAM",
    appId =
      process.env[instagram ? "CRM_INSTAGRAM_APP_ID" : "CRM_META_APP_ID"] || "",
    appSecret =
      process.env[
        instagram ? "CRM_INSTAGRAM_APP_SECRET" : "CRM_META_APP_SECRET"
      ] || "",
    version = process.env.CRM_META_GRAPH_VERSION || "",
    verifyToken = process.env.CRM_META_WEBHOOK_VERIFY_TOKEN || "",
    configId = process.env.CRM_WHATSAPP_CONFIG_ID || "";
  const rawKey = process.env.CRM_ENCRYPTION_KEY || "",
    key = /^[a-f0-9]{64}$/i.test(rawKey)
      ? Buffer.from(rawKey, "hex")
      : Buffer.from(rawKey, "base64");
  const enabled =
    /^\d+$/.test(appId) &&
    !!appSecret &&
    /^v\d+\.\d+$/.test(version) &&
    verifyToken.length >= 24 &&
    key.length === 32 &&
    (channel !== "WHATSAPP" || /^\d+$/.test(configId));
  if (strict && !enabled)
    fail("Bu kanalın qoşulmasını NEW ERA komandası aktivləşdirməlidir.", 503);
  return {
    appId,
    appSecret,
    version,
    verifyToken,
    configId,
    enabled,
    instagram,
    callback: strict
      ? appOrigin() + "/api/workspace-social/callback/" + channel.toLowerCase()
      : "",
    coexistence: process.env.CRM_WHATSAPP_COEXISTENCE === "true",
  };
}
export function graph(channel: SocialChannel, path: string) {
  const cfg = socialConfig(channel);
  return `https://graph.${channel === "INSTAGRAM" ? "instagram" : "facebook"}.com/${cfg.version}/${path}`;
}
export async function metaJSON(
  url: string,
  token?: string,
  init: RequestInit = {},
) {
  try {
    const r = await fetch(url, {
      ...init,
      redirect: "error",
      headers: {
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...init.headers,
      },
      signal: AbortSignal.timeout(8000),
    });
    const data = JSON.parse(
      (await bytes(r as unknown as Request, 2097152)).toString("utf8"),
    );
    if (!r.ok || data.error)
      throw new SocialError(
        [401, 403].includes(r.status) || data.error?.code === 190
          ? "RECONNECT_REQUIRED"
          : "PROVIDER_ERROR",
      );
    return data;
  } catch (e) {
    if (e instanceof SocialError) throw e;
    throw new SocialError("PROVIDER_UNAVAILABLE");
  }
}
export function formBody(data: Record<string, string>): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(data),
  };
}
export async function debugMeta(accessToken: string, channel: SocialChannel) {
  const cfg = socialConfig(channel),
    url = new URL(graph(channel, "debug_token"));
  url.searchParams.set("input_token", accessToken);
  const result = await metaJSON(
    url.toString(),
    cfg.appId + "|" + cfg.appSecret,
  );
  const d = result.data;
  if (!d?.is_valid || String(d.app_id) !== cfg.appId)
    throw new SocialError("RECONNECT_REQUIRED");
  if (Number(d.expires_at) > 0 && Number(d.expires_at) * 1000 <= Date.now())
    throw new SocialError("RECONNECT_REQUIRED");
  if (
    Number(d.data_access_expires_at) > 0 &&
    Number(d.data_access_expires_at) * 1000 <= Date.now()
  )
    throw new SocialError("RECONNECT_REQUIRED");
  return d;
}
function expiration(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Date.now() + n * 1000 : null;
}
export async function exchangeSocial(
  channel: SocialChannel,
  code: string,
  hints: { wabaIds?: string[]; phoneId?: string } = {},
): Promise<SocialSecret> {
  const cfg = socialConfig(channel);
  let accessToken = "",
    expiresAt: number | null = null;
  const choices: SocialChoice[] = [];
  let subjectId: string | undefined;
  if (channel === "INSTAGRAM") {
    const body = new FormData();
    Object.entries({
      client_id: cfg.appId,
      client_secret: cfg.appSecret,
      grant_type: "authorization_code",
      redirect_uri: cfg.callback,
      code,
    }).forEach(([k, v]) => body.set(k, v));
    const short = await metaJSON(
      "https://api.instagram.com/oauth/access_token",
      undefined,
      { method: "POST", body },
    );
    const shortToken = short.access_token || short.data?.[0]?.access_token;
    if (typeof shortToken !== "string")
      throw new SocialError("PERMISSIONS_MISSING");
    const longURL = new URL("https://graph.instagram.com/access_token");
    longURL.search = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: cfg.appSecret,
      access_token: shortToken,
    }).toString();
    const long = await metaJSON(longURL.toString());
    accessToken = String(long.access_token || "");
    expiresAt = expiration(long.expires_in);
    if (!accessToken || !expiresAt)
      throw new SocialError("PERMISSIONS_MISSING");
    const profile = await metaJSON(
      graph(channel, "me?fields=user_id,username"),
      accessToken,
    );
    const id = String(profile.user_id || profile.id || "");
    if (!/^\d{1,80}$/.test(id)) throw new SocialError("PERMISSIONS_MISSING");
    subjectId = id;
    choices.push({ id, name: "@" + String(profile.username || id) });
  } else {
    const url = new URL(graph(channel, "oauth/access_token"));
    url.search = new URLSearchParams({
      client_id: cfg.appId,
      client_secret: cfg.appSecret,
      code,
      ...(channel === "MESSENGER" ? { redirect_uri: cfg.callback } : {}),
    }).toString();
    const out = await metaJSON(url.toString());
    accessToken = String(out.access_token || "");
    if (!accessToken) throw new SocialError("PERMISSIONS_MISSING");
    if (channel === "MESSENGER") {
      const longURL = new URL(graph(channel, "oauth/access_token"));
      longURL.search = new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: cfg.appId,
        client_secret: cfg.appSecret,
        fb_exchange_token: accessToken,
      }).toString();
      const longer = await metaJSON(longURL.toString());
      accessToken = String(longer.access_token || "");
      expiresAt = expiration(longer.expires_in);
    }
    const debug = await debugMeta(accessToken, channel),
      scopes = Array.isArray(debug.scopes) ? debug.scopes : [];
    subjectId = String(debug.user_id || "");
    if (
      !(
        channel === "MESSENGER"
          ? ["pages_messaging", "pages_show_list", "pages_manage_metadata"]
          : ["whatsapp_business_management", "whatsapp_business_messaging"]
      ).every((p) => scopes.includes(p))
    )
      throw new SocialError("PERMISSIONS_MISSING");
    const expiry = [debug.expires_at, debug.data_access_expires_at]
      .map(Number)
      .filter((n) => n > 0)
      .map((n) => n * 1000);
    if (expiry.length)
      expiresAt = Math.min(...expiry, ...(expiresAt ? [expiresAt] : []));
    if (channel === "MESSENGER") {
      let after = "";
      for (let page = 0; page < 10; page++) {
        const q = new URLSearchParams({
          fields: "id,name,access_token",
          limit: "50",
          ...(after ? { after } : {}),
        });
        const result = await metaJSON(
          graph(channel, "me/accounts?" + q),
          accessToken,
        );
        for (const item of result.data || [])
          if (
            /^\d{1,80}$/.test(String(item.id)) &&
            typeof item.access_token === "string"
          )
            choices.push({
              id: String(item.id),
              name: String(item.name || item.id).slice(0, 200),
              token: item.access_token,
            });
        after = result.paging?.cursors?.after || "";
        if (!result.paging?.next || !after) break;
      }
    } else {
      const granular = (debug.granular_scopes || [])
        .filter((s: any) =>
          [
            "whatsapp_business_management",
            "whatsapp_business_messaging",
          ].includes(s.scope),
        )
        .flatMap((s: any) => s.target_ids || [])
        .map(String);
      const wabas = [
        ...new Set<string>(hints.wabaIds?.length ? hints.wabaIds : granular),
      ].slice(0, 10);
      if (!wabas.length) throw new SocialError("ASSET_SELECTION_REQUIRED");
      for (const waba of wabas) {
        if (!/^\d{1,80}$/.test(waba))
          throw new SocialError("ASSET_SELECTION_REQUIRED");
        const result = await metaJSON(
          graph(
            channel,
            `${waba}/phone_numbers?fields=id,display_phone_number,verified_name,status,code_verification_status&limit=100`,
          ),
          accessToken,
        );
        for (const phone of result.data || []) {
          const id = String(phone.id || "");
          if (!/^\d{1,80}$/.test(id) || (hints.phoneId && id !== hints.phoneId))
            continue;
          if (phone.code_verification_status !== "VERIFIED") continue;
          choices.push({
            id,
            parentId: waba,
            name:
              [phone.verified_name, phone.display_phone_number]
                .filter(Boolean)
                .join(" · ")
                .slice(0, 200) || id,
            requiresPin: !cfg.coexistence && phone.status !== "CONNECTED",
            status: String(phone.status || ""),
          });
        }
      }
    }
  }
  if (!choices.length) throw new SocialError("NO_ELIGIBLE_ACCOUNT");
  return { accessToken, expiresAt, issuedAt: Date.now(), subjectId, choices };
}
export async function subscribeSocial(
  channel: SocialChannel,
  choice: SocialChoice,
  secret: SocialSecret,
  pin?: string,
) {
  const access = choice.token || secret.accessToken,
    cfg = socialConfig(channel);
  if (channel === "WHATSAPP" && choice.requiresPin) {
    if (!/^\d{6}$/.test(pin || ""))
      throw new SocialError("BUSINESS_PIN_REQUIRED");
    const registration = await metaJSON(
      graph(channel, choice.id + "/register"),
      access,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", pin }),
      },
    );
    if (registration.success !== true)
      throw new SocialError("REGISTRATION_REQUIRED");
  }
  if (
    channel === "WHATSAPP" &&
    cfg.coexistence &&
    choice.status !== "CONNECTED"
  )
    throw new SocialError("REGISTRATION_REQUIRED");
  const path =
    channel === "INSTAGRAM"
      ? "me/subscribed_apps"
      : (channel === "WHATSAPP" ? choice.parentId : choice.id) +
        "/subscribed_apps";
  const result = await metaJSON(
    graph(channel, path),
    access,
    formBody(channel === "WHATSAPP" ? {} : { subscribed_fields: "messages" }),
  );
  if (result.success !== true) throw new SocialError("SUBSCRIPTION_FAILED");
  return access;
}
export const socialErrorText = (code: string | null) =>
  ({
    RECONNECT_REQUIRED: "Hesaba yenidən daxil olub bağlantıya icazə verin.",
    PERMISSIONS_MISSING:
      "Mesajlara giriş icazəsi verilmədi. Qoşulmanı yenidən başladın.",
    NO_ELIGIBLE_ACCOUNT:
      "Qoşula bilən biznes hesabı tapılmadı. Hesabın növünü və idarəetmə icazənizi yoxlayın.",
    ASSET_SELECTION_REQUIRED:
      "Biznes hesabını və nömrəni Meta pəncərəsində seçib yenidən cəhd edin.",
    BUSINESS_PIN_REQUIRED:
      "Nömrəni aktivləşdirmək üçün 6 rəqəmli WhatsApp biznes PIN-i tələb olunur.",
    REGISTRATION_REQUIRED:
      "WhatsApp nömrəsinin Meta tərəfində aktivləşdirilməsi tamamlanmayıb.",
    SUBSCRIPTION_FAILED: "Mesaj bağlantısı aktivləşdirilmədi. Yenidən qoşun.",
    PROVIDER_UNAVAILABLE:
      "Xidmətə hazırda qoşulmaq mümkün deyil. Bir qədər sonra yenidən cəhd edin.",
    PROVIDER_ERROR:
      "Hesab bağlantısı yoxlanmadı. Yenidən cəhd edin və ya dəstəklə əlaqə saxlayın.",
    EXPIRED: "Qoşulma müddəti bitdi. Yenidən başladın.",
    CANCELLED: "Qoşulma ləğv edildi.",
  })[code || ""] || "Qoşulmanı yenidən başladın.";
