import { prisma } from "@/lib/prisma";
import {
  tx,
  context,
  permit,
  write,
  hash,
  token,
  log,
  type Actor,
  type DB,
} from "./db";
import { encrypt, decrypt } from "./security";
import { appOrigin } from "./mail";
import { fail, required, state } from "./policy";
export type Credentials = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};
const provider = (p: string) => {
  if (!["google", "microsoft"].includes(p)) fail("Provayder uyğun deyil.");
  return p;
};
function oauth(p: string) {
  provider(p);
  const google = p === "google",
    clientId =
      process.env[google ? "CRM_GOOGLE_CLIENT_ID" : "CRM_MICROSOFT_CLIENT_ID"],
    clientSecret =
      process.env[
        google ? "CRM_GOOGLE_CLIENT_SECRET" : "CRM_MICROSOFT_CLIENT_SECRET"
      ];
  if (!clientId || !clientSecret || !process.env.CRM_ENCRYPTION_KEY)
    fail("Provayder tətbiqi və server şifrələmə açarı qurulmayıb.", 503);
  return {
    clientId,
    clientSecret,
    redirectUri: appOrigin() + "/api/workspace-connect/" + p + "/callback",
    authorize: google
      ? "https://accounts.google.com/o/oauth2/v2/auth"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: google
      ? "https://oauth2.googleapis.com/token"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  };
}
export async function requestJSON(
  url: string,
  accessToken: string,
  init: RequestInit = {},
) {
  const r = await fetch(url, {
    ...init,
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok)
    throw Object.assign(new Error("PROVIDER_HTTP_" + r.status), {
      code: "PROVIDER_HTTP_" + r.status,
    });
  return r.status === 204 || r.status === 202 ? {} : await r.json();
}
export async function connections(
  u: Actor,
  id: string,
  b?: Record<string, unknown>,
) {
  return tx(async (db) => {
    const c = await context(db, u, id);
    permit(c, "settings", b ? "update" : "read");
    if (!b)
      return {
        configured: {
          google: Boolean(
            process.env.CRM_GOOGLE_CLIENT_ID &&
              process.env.CRM_GOOGLE_CLIENT_SECRET &&
              process.env.CRM_ENCRYPTION_KEY,
          ),
          microsoft: Boolean(
            process.env.CRM_MICROSOFT_CLIENT_ID &&
              process.env.CRM_MICROSOFT_CLIENT_SECRET &&
              process.env.CRM_ENCRYPTION_KEY,
          ),
        },
        items: await db.crmConnection.findMany({
          where: { companyId: id },
          select: {
            id: true,
            provider: true,
            channel: true,
            memberId: true,
            email: true,
            active: true,
            updatedAt: true,
          },
        }),
      };
    write(c);
    if (b.action === "disconnect") {
      await db.crmConnection.updateMany({
        where: { id: required(b.id), companyId: id },
        data: { active: false, secret: encrypt("{}") },
      });
      await log(db, id, u, "CONNECTION_DISCONNECTED");
      return { ok: true };
    }
    if (!c.member) fail("Üzvlük tələb olunur.", 403);
    const p = provider(required(b.provider)),
      channel = required(b.channel);
    if (!["MAIL", "CALENDAR"].includes(channel))
      fail("Bağlantı növü düzgün deyil.");
    const cfg = oauth(p),
      raw = token(),
      stateValue = id + "." + raw;
    await db.crmEvent.create({
      data: {
        companyId: id,
        type: "OAUTH",
        key: "oauth:" + hash(raw),
        userId: u.id,
        data: { provider: p, channel, memberId: c.member.id, used: false },
      },
    });
    const scopes =
      p === "google"
        ? [
            "openid",
            "email",
            ...(channel === "MAIL"
              ? [
                  "https://www.googleapis.com/auth/gmail.readonly",
                  "https://www.googleapis.com/auth/gmail.send",
                ]
              : ["https://www.googleapis.com/auth/calendar.events"]),
          ]
        : [
            "openid",
            "email",
            "offline_access",
            "User.Read",
            ...(channel === "MAIL"
              ? ["Mail.Read", "Mail.Send"]
              : ["Calendars.ReadWrite"]),
          ];
    const url = new URL(cfg.authorize);
    Object.entries({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      state: stateValue,
      ...(p === "google" ? { access_type: "offline", prompt: "consent" } : {}),
    }).forEach(([k, v]) => url.searchParams.set(k, v));
    return { url: url.toString() };
  });
}
export async function callback(
  u: Actor,
  p: string,
  stateValue: string,
  code: string,
) {
  const [id, raw] = stateValue.split(".");
  if (!id || !raw) fail("OAuth vəziyyəti düzgün deyil.");
  const pending = await prisma.crmEvent.findUnique({
    where: { companyId_key: { companyId: id, key: "oauth:" + hash(raw) } },
  });
  const d = pending?.data as Record<string, unknown>;
  if (
    !pending ||
    pending.type !== "OAUTH" ||
    pending.userId !== u.id ||
    Date.now() - pending.createdAt.getTime() > 600000 ||
    d.used ||
    d.provider !== p
  )
    fail("OAuth sorğusu bitib və ya bu hesaba aid deyil.", 403);
  await tx(async (db) => {
    const c = await context(db, u, id);
    permit(c, "settings", "update");
    write(c);
    const claim = await db.crmEvent.updateMany({
      where: { id: pending.id, data: { path: ["used"], equals: false } },
      data: { data: { ...d, used: true } as never },
    });
    if (!claim.count) fail("OAuth sorğusu artıq istifadə edilib.", 409);
  });
  const cfg = oauth(p),
    r = await fetch(cfg.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
        grant_type: "authorization_code",
        code,
      }),
      signal: AbortSignal.timeout(8000),
    });
  if (!r.ok) fail("Provayder hesabı bağlanmadı. Yenidən qoşun.", 502);
  const result = await r.json();
  if (!result.access_token || !result.refresh_token)
    fail(
      "Davamlı giriş icazəsi verilmədi. Provayderdən yenidən razılıq verin.",
      502,
    );
  const profile = await requestJSON(
    p === "google"
      ? "https://openidconnect.googleapis.com/v1/userinfo"
      : "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName",
    result.access_token,
  );
  const email = String(
    profile.email || profile.mail || profile.userPrincipalName || "",
  ).toLowerCase();
  if (!email) fail("Provayder e-poçtu müəyyən edilmədi.", 502);
  return tx(async (db) => {
    const c = await context(db, u, id);
    permit(c, "settings", "update");
    write(c);
    if (!c.member || c.member.id !== d.memberId) fail("Üzvlük dəyişib.", 403);
    const other = await db.crmConnection.findFirst({
      where: {
        companyId: { not: id },
        provider: p,
        email,
        channel: String(d.channel),
        active: true,
      },
    });
    if (other) fail("Bu provayder hesabı başqa şirkətə bağlanıb.", 409);
    const secret = encrypt(
      JSON.stringify({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        expiresAt: Date.now() + Number(result.expires_in || 3600) * 1000,
      }),
    );
    await db.crmConnection.upsert({
      where: {
        companyId_channel_memberId: {
          companyId: id,
          channel: String(d.channel),
          memberId: c.member.id,
        },
      },
      create: {
        companyId: id,
        channel: String(d.channel),
        memberId: c.member.id,
        provider: p,
        email,
        secret,
      },
      update: { provider: p, email, secret, active: true, cursor: {} },
    });
    await log(db, id, u, "CONNECTION_CONNECTED", {
      provider: p,
      channel: String(d.channel),
      email,
    });
    return "/workspace/" + id + "?section=settings";
  });
}
export async function credential(
  connection: {
    id: string;
    provider: string;
    secret: string;
    companyId: string;
  },
  db: Pick<DB, "crmConnection"> = prisma,
) {
  const s = JSON.parse(decrypt(connection.secret)) as Credentials;
  if (s.accessToken && s.expiresAt > Date.now() + 60000) return s.accessToken;
  if (!s.refreshToken) fail("Provayder hesabını yenidən qoşun.", 503);
  const cfg = oauth(connection.provider);
  const response = await fetch(cfg.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "refresh_token",
      refresh_token: s.refreshToken,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok)
    fail("Provayderin giriş icazəsi yenilənmədi. Hesabı yenidən qoşun.", 503);
  const out = await response.json();
  if (!out.access_token) fail("Giriş icazəsi alınmadı.", 503);
  await db.crmConnection.updateMany({
    where: { id: connection.id, companyId: connection.companyId, active: true },
    data: {
      secret: encrypt(
        JSON.stringify({
          accessToken: out.access_token,
          refreshToken: out.refresh_token || s.refreshToken,
          expiresAt: Date.now() + Number(out.expires_in || 3600) * 1000,
        }),
      ),
    },
  });
  return String(out.access_token);
}
export async function activeConnection(
  db: DB,
  id: string,
  channel: string,
  memberId?: string,
) {
  const row = await db.crmConnection.findFirst({
    where: {
      companyId: id,
      channel,
      active: true,
      ...(memberId ? { memberId } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
  if (!row) return null;
  const company = await db.crmCompany.findUnique({ where: { id } });
  const member = await db.crmSeat.findFirst({
    where: { id: row.memberId, companyId: id, active: true },
  });
  if (!member || !company || !["TRIAL", "ACTIVE"].includes(state(company)))
    return null;
  return row;
}
export async function syncNow(u: Actor, id: string, connectionId: string) {
  const conn = await tx(async (db) => {
    const c = await context(db, u, id);
    permit(c, "settings", "update");
    write(c);
    const conn =
      (await db.crmConnection.findFirst({
        where: { id: connectionId, companyId: id, active: true },
      })) || fail("Bağlantı tapılmadı.", 404);
    if (
      await db.crmEvent.count({
        where: {
          companyId: id,
          type: "MANUAL_SYNC",
          entryId: conn.id,
          createdAt: { gt: new Date(Date.now() - 60000) },
        },
      })
    )
      fail("Bir dəqiqə gözləyin.", 429);
    await db.crmEvent.create({
      data: {
        companyId: id,
        type: "MANUAL_SYNC",
        entryId: conn.id,
        actorId: u.id,
        data: { provider: conn.provider, channel: conn.channel },
      },
    });
    return conn;
  });
  const sync = await import("./sync");
  try {
    if (conn.channel === "MAIL") await sync.syncMail(conn);
    else await sync.syncCalendarChanges(conn);
    await tx(async (db) => {
      const c = await context(db, u, id);
      permit(c, "settings", "read");
    });
    return {
      ok: true,
      notice:
        "Sinxronizasiya paketi tamamlandı. Böyük inbox növbəti çağırışda davam edir.",
    };
  } catch {
    await prisma.crmEvent.create({
      data: {
        companyId: id,
        type: "PROVIDER",
        actorId: u.id,
        data: {
          channel: conn.channel,
          state: "ERROR",
          message:
            "Sinxronizasiya tamamlanmadı. Provayder icazələrini yoxlayın.",
        },
      },
    });
    fail(
      "Sinxronizasiya tamamlanmadı. Hesabı və provayder icazələrini yoxlayın.",
      502,
    );
  }
}
