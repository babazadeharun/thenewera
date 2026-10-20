import { cookies } from "next/headers";
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
import { fail, required, state } from "./policy";
import { appOrigin } from "./mail";
import {
  socialChannels,
  socialChannel,
  socialConfig,
  socialName,
  socialErrorText,
  SocialError,
  exchangeSocial,
  subscribeSocial,
  metaJSON,
  graph,
  debugMeta,
  type SocialChannel,
  type SocialSecret,
  type SocialChoice,
} from "./social-api";
async function sessionHash() {
  const value = (await cookies()).get("new-era-session")?.value;
  if (!value) fail("Daxil olun.", 401);
  return hash(value);
}
async function guard(db: DB, u: Actor, id: string, change = false) {
  const c = await context(db, u, id);
  permit(c, "settings", change ? "update" : "read");
  if (!c.member) fail("Aktiv şirkət üzvlüyü tələb olunur.", 403);
  return c;
}
const decode = (value: string | null): SocialSecret => {
  if (!value) fail("Qoşulma müddəti bitib.", 410);
  try {
    return JSON.parse(decrypt(value));
  } catch {
    fail("Bağlantını yenidən qoşun.", 503);
  }
};
function errorCode(e: unknown) {
  return e instanceof SocialError ? e.code : "PROVIDER_ERROR";
}
export async function socialList(u: Actor, id: string) {
  return tx(async (db) => {
    const c = await guard(db, u, id);
    const items = await db.crmSocialConnection.findMany({
      where: { companyId: id },
      select: {
        id: true,
        channel: true,
        externalId: true,
        displayName: true,
        state: true,
        expiresAt: true,
        lastCheckedAt: true,
        errorCode: true,
        memberId: true,
        member: {select:{active:true}},
      },
    });
    let canDisconnect=false;try{permit(c,'settings','update');canDisconnect=true;}catch{}
    return {canDisconnect,
      channels: socialChannels.map((channel) => {
        const cfg = socialConfig(channel, false),
          item = items.find((x) => x.channel === channel);
        return {
          channel,
          name: socialName(channel),
          enabled: cfg.enabled,
          ...(item
            ? {
                ...item,
                state:
                  item.state === "CONNECTED" &&
                  (!item.member.active || Boolean(item.expiresAt && item.expiresAt < new Date()))
                    ? "RECONNECT_REQUIRED"
                    : item.state,
                error: item.errorCode ? socialErrorText(item.errorCode) : null,
              }
            : {}),
        };
      }),
      capabilities: { text: true, historyImport: false, media: false },
      notice:
        "Hər şirkət üçün hər kanaldan bir biznes hesabı qoşulur. Köhnə yazışmalar avtomatik idxal edilmir.",
    };
  });
}
export async function startSocial(
  u: Actor,
  id: string,
  b: Record<string, unknown>,
) {
  const channel = socialChannel(b.channel),
    cfg = socialConfig(channel),
    session = await sessionHash(),
    raw = token();
  const pending = await tx(async (db) => {
    const c = await guard(db, u, id, true);
    write(c, "messages");
    if (
      (await db.crmSocialAuth.count({
        where: {
          companyId: id,
          userId: u.id,
          createdAt: { gt: new Date(Date.now() - 60000) },
        },
      })) >= 5
    )
      fail("Bir dəqiqə gözləyib yenidən cəhd edin.", 429);
    return db.crmSocialAuth.create({
      data: {
        companyId: id,
        memberId: c.member!.id,
        userId: u.id,
        sessionHash: session,
        stateHash: hash(raw),
        channel,
        expiresAt: new Date(Date.now() + 600000),
      },
    });
  });
  if (channel === "WHATSAPP")
    return {
      authId: pending.id,
      state: raw,
      mode: "EMBEDDED",
      appId: cfg.appId,
      configId: cfg.configId,
      version: cfg.version,
      coexistence: cfg.coexistence,
      sessionInfoVersion:
        process.env.CRM_WHATSAPP_SESSION_INFO_VERSION === "3" ? "3" : "4",
    };
  const url = new URL(
    channel === "INSTAGRAM"
      ? "https://www.instagram.com/oauth/authorize"
      : `https://www.facebook.com/${cfg.version}/dialog/oauth`,
  );
  url.search = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: cfg.callback,
    response_type: "code",
    state: raw,
    scope:
      channel === "INSTAGRAM"
        ? "instagram_business_basic,instagram_business_manage_messages"
        : "pages_show_list,pages_messaging,pages_manage_metadata",
    ...(channel === "INSTAGRAM"
      ? { enable_fb_login: "0", force_authentication: "1" }
      : { auth_type: "rerequest" }),
  }).toString();
  return { authId: pending.id, mode: "OAUTH", url: url.toString() };
}
async function pendingFor(
  db: DB,
  u: Actor,
  id: string,
  authId: string,
  session: string,
  change = false,
) {
  const c = await guard(db, u, id, change);
  const p = await db.crmSocialAuth.findFirst({
    where: {
      id: authId,
      companyId: id,
      userId: u.id,
      memberId: c.member!.id,
      sessionHash: session,
    },
  });
  if (!p) fail("Bu qoşulma sorğusu sizə aid deyil.", 403);
  return { c, p };
}
export async function socialPending(u: Actor, id: string, authId: string) {
  const session = await sessionHash();
  return tx(async (db) => {
    const { p } = await pendingFor(db, u, id, authId, session);
    if (
      p.expiresAt < new Date() &&
      !["COMPLETE", "CANCELLED", "ERROR", "EXPIRED"].includes(p.state)
    ) {
      await db.crmSocialAuth.update({
        where: { id: p.id },
        data: { state: "EXPIRED", secret: null, errorCode: "EXPIRED" },
      });
      return { id: p.id, state: "EXPIRED", error: socialErrorText("EXPIRED") };
    }
    const secret = p.state === "SELECT" ? decode(p.secret) : null;
    return {
      id: p.id,
      channel: p.channel,
      state: p.state,
      error: p.errorCode ? socialErrorText(p.errorCode) : null,
      expiresAt: p.expiresAt,
      choices:
        secret?.choices?.map(({ id, name, requiresPin }) => ({
          id,
          name,
          requiresPin: Boolean(requiresPin),
        })) || [],
    };
  });
}
async function claimAuth(
  u: Actor,
  raw: string,
  expected: SocialChannel,
  authId?: string,
  companyId?: string,
) {
  const session = await sessionHash();
  return tx(async (db) => {
    const found = await db.crmSocialAuth.findUnique({
      where: { stateHash: hash(raw) },
    });
    if (
      !found ||
      found.channel !== expected ||
      (authId && found.id !== authId) ||
      (companyId && found.companyId !== companyId)
    )
      fail("Qoşulma sorğusu düzgün deyil.", 403);
    const { c, p } = await pendingFor(
      db,
      u,
      found.companyId,
      found.id,
      session,
      true,
    );
    write(c, "messages");
    if (p.expiresAt < new Date())
      fail("Qoşulma müddəti bitib. Yenidən başladın.", 410);
    if (p.state !== "PENDING")
      fail("Qoşulma sorğusu artıq istifadə edilib.", 409);
    const claimed = await db.crmSocialAuth.updateMany({
      where: { id: p.id, state: "PENDING" },
      data: { state: "EXCHANGING" },
    });
    if (!claimed.count) fail("Qoşulma sorğusu artıq istifadə edilib.", 409);
    return p;
  });
}
async function completeCode(
  u: Actor,
  p: Awaited<ReturnType<typeof claimAuth>>,
  code: string,
  hints: { wabaIds?: string[]; phoneId?: string } = {},
) {
  try {
    const secret = await exchangeSocial(socialChannel(p.channel), code, hints);
    await tx(async (db) => {
      const c = await guard(db, u, p.companyId, true);
      write(c, "messages");
      if (c.member!.id !== p.memberId) fail("Üzvlük dəyişib.", 403);
      const updated = await db.crmSocialAuth.updateMany({
        where: { id: p.id, state: "EXCHANGING", expiresAt: { gt: new Date() } },
        data: { secret: encrypt(JSON.stringify(secret)), state: "SELECT" },
      });
      if (!updated.count) fail("Qoşulma müddəti bitib.", 410);
    });
  } catch (e) {
    await prisma.crmSocialAuth.updateMany({
      where: { id: p.id, state: "EXCHANGING" },
      data: { secret: null, state: "ERROR", errorCode: errorCode(e) },
    });
  }
  return { authId: p.id, companyId: p.companyId };
}
export async function socialCallback(
  u: Actor,
  channel: SocialChannel,
  raw: string,
  code: string,
  cancelled = false,
) {
  const p = await claimAuth(u, raw, channel);
  if (cancelled || !code) {
    await prisma.crmSocialAuth.updateMany({
      where: { id: p.id, state: "EXCHANGING" },
      data: { state: "CANCELLED", secret: null, errorCode: "CANCELLED" },
    });
    return { authId: p.id, companyId: p.companyId };
  }
  return completeCode(u, p, required(code, 4096));
}
export async function finishEmbedded(
  u: Actor,
  id: string,
  b: Record<string, unknown>,
) {
  const p = await claimAuth(
    u,
    required(b.state, 100),
    "WHATSAPP",
    required(b.authId),
    id,
  );
  if (p.companyId !== id) fail("Şirkət uyğun deyil.", 403);
  const wabaIds = Array.isArray(b.wabaIds)
    ? b.wabaIds.slice(0, 10).map((x) => required(x, 80))
    : [];
  if (wabaIds.some((x) => !/^\d+$/.test(x)))
    fail("Biznes hesabı düzgün deyil.");
  const phoneId = b.phoneId ? required(b.phoneId, 80) : undefined;
  if (phoneId && !/^\d+$/.test(phoneId)) fail("Nömrə seçimi düzgün deyil.");
  return completeCode(u, p, required(b.code, 4096), { wabaIds, phoneId });
}
export async function cancelSocial(u: Actor, id: string, authId: string) {
  const session = await sessionHash();
  return tx(async (db) => {
    const { p } = await pendingFor(db, u, id, authId, session, true);
    if (p.state === "SAVING") fail("Qoşulmanın tamamlanmasını gözləyin.", 409);
    await db.crmSocialAuth.update({
      where: { id: p.id },
      data: { state: "CANCELLED", secret: null, errorCode: "CANCELLED" },
    });
    return { ok: true };
  });
}
export async function activateSocial(
  u: Actor,
  id: string,
  b: Record<string, unknown>,
) {
  if (b.confirm !== true) fail("Seçilmiş hesabın qoşulmasını təsdiqləyin.");
  const session = await sessionHash(),
    authId = required(b.authId),
    externalId = required(b.externalId, 80);
  const prepared = await tx(async (db) => {
    const { c, p } = await pendingFor(db, u, id, authId, session, true);
    write(c, "messages");
    if (p.expiresAt < new Date() || p.state !== "SELECT")
      fail("Qoşulma sorğusu bitib və ya artıq istifadə edilib.", 409);
    const channel = socialChannel(p.channel),
      secret = decode(p.secret),
      choice = secret.choices?.find((x) => x.id === externalId);
    if (!choice) fail("Hesabı rəsmi siyahıdan seçin.", 403);
    if (choice.requiresPin && !/^\d{6}$/.test(String(b.pin || "")))
      fail(socialErrorText("BUSINESS_PIN_REQUIRED"));
    const assetKey = channel + ":" + externalId,
      other = await db.crmSocialConnection.findUnique({ where: { assetKey } });
    if (other && other.companyId !== id)
      fail(
        "Bu hesab başqa şirkətə bağlıdır. Əvvəl oradakı bağlantını ayırın.",
        409,
      );
    const existing = await db.crmSocialConnection.findUnique({
      where: { companyId_channel: { companyId: id, channel } },
    });
    if (
      existing &&
      existing.state !== "DISCONNECTED" &&
      existing.externalId !== externalId
    )
      fail("Əvvəl bu kanaldakı mövcud hesabı ayırın.", 409);
    if (existing?.state === "CONNECTING")
      fail("Qoşulma artıq davam edir.", 409);
    const claim = await db.crmSocialAuth.updateMany({
      where: { id: p.id, state: "SELECT" },
      data: { state: "SAVING" },
    });
    if (!claim.count) fail("Qoşulma artıq davam edir.", 409);
    const data = {
      memberId: c.member!.id,
      assetKey,
      externalId,
      parentId: choice.parentId || null,
      displayName: choice.name,
      secret: encrypt(
        JSON.stringify({
          ...secret,
          accessToken: choice.token || secret.accessToken,
          choices: undefined,
        }),
      ),
      expiresAt: secret.expiresAt ? new Date(secret.expiresAt) : null,
      state: "CONNECTING",
      attemptId: p.id,
      readyAt: null,
      subjectId: secret.subjectId || null,
      errorCode: null,
    };
    const connection = await db.crmSocialConnection.upsert({
      where: { companyId_channel: { companyId: id, channel } },
      create: { companyId: id, channel, ...data },
      update: data,
    });
    return { p, secret, choice, connection };
  });
  try {
    // Verify that the grant still works just before enabling provider delivery.
    const channel = socialChannel(prepared.p.channel),
      access = prepared.choice.token || prepared.secret.accessToken;
    if (channel === "INSTAGRAM") {
      const profile = await metaJSON(graph(channel, "me?fields=user_id,username"), access);
      if (String(profile.user_id || profile.id || "") !== prepared.choice.id)
        throw new SocialError("RECONNECT_REQUIRED");
    } else await debugMeta(access, channel);
    await subscribeSocial(
      channel,
      prepared.choice,
      prepared.secret,
      String(b.pin || ""),
    );
    await tx(async (db) => {
      const c = await guard(db, u, id, true);
      write(c, "messages");
      if (c.member!.id !== prepared.p.memberId) fail("Üzvlük dəyişib.", 403);
      const updated = await db.crmSocialConnection.updateMany({
        where: {
          id: prepared.connection.id,
          companyId: id,
          state: "CONNECTING",
          attemptId: authId,
        },
        data: {
          state: "CONNECTED",
          readyAt: new Date(),
          lastCheckedAt: new Date(),
          errorCode: null,
        },
      });
      if (!updated.count) fail("Qoşulma ləğv edilib.", 409);
      await db.crmSocialAuth.update({
        where: { id: authId },
        data: { state: "COMPLETE", secret: null },
      });
      await log(db, id, u, "SOCIAL_CONNECTED", {
        channel,
        account: prepared.choice.name,
      });
    });
    return { ok: true };
  } catch (e) {
    await prisma.$transaction([
      prisma.crmSocialConnection.updateMany({
        where: {
          id: prepared.connection.id,
          attemptId: authId,
          state: "CONNECTING",
        },
        data: { state: "ERROR", errorCode: errorCode(e) },
      }),
      prisma.crmSocialAuth.updateMany({
        where: { id: authId, state: "SAVING" },
        data: { state: "ERROR", secret: null, errorCode: errorCode(e) },
      }),
    ]);
    fail(socialErrorText(errorCode(e)), 502);
  }
}
export async function disconnectSocial(
  u: Actor,
  id: string,
  connectionId: string,
) {
  const old = await tx(async (db) => {
    await guard(db, u, id, true);
    const row = await db.crmSocialConnection.findFirst({
      where: { id: connectionId, companyId: id },
    });
    if (!row) fail("Bağlantı tapılmadı.", 404);
    await db.crmSocialConnection.update({
      where: { id: row.id },
      data: {
        state: "DISCONNECTED",
        secret: "",
        assetKey: null,
        attemptId: null,
        readyAt: null,
        errorCode: null,
      },
    });
    await db.crmSocialAuth.updateMany({
      where: {
        companyId: id,
        channel: row.channel,
        state: { in: ["PENDING", "SELECT", "EXCHANGING"] },
      },
      data: { state: "CANCELLED", secret: null, errorCode: "CANCELLED" },
    });
    await log(db, id, u, "SOCIAL_DISCONNECTED", {
      channel: row.channel,
      account: row.displayName,
    });
    return row;
  });
  let remoteRemoved = false;
  try {
    const channel = socialChannel(old.channel);
    const others =
      channel === "WHATSAPP"
        ? await prisma.crmSocialConnection.count({
            where: {
              channel,
              parentId: old.parentId,
              state: { in: ["CONNECTED", "CONNECTING"] },
            },
          })
        : 0;
    if (!others && old.secret) {
      const path =
        channel === "INSTAGRAM"
          ? "me/subscribed_apps"
          : (channel === "WHATSAPP" ? old.parentId : old.externalId) +
            "/subscribed_apps";
      const result = await metaJSON(
        graph(channel, path),
        decode(old.secret).accessToken,
        { method: "DELETE" },
      );
      remoteRemoved = result.success === true;
    }
  } catch {
    /* Local access is already stopped. Never revive it after a remote error. */
  }
  return {
    ok: true,
    notice: remoteRemoved
      ? "Bağlantı ayrıldı."
      : "Workspace bağlantısı ayrıldı. Lazım gələrsə Meta hesabınızdakı tətbiq icazəsini də silə bilərsiniz.",
  };
}
export async function resolveSocial(
  db: DB,
  id: string,
  channel: SocialChannel,
) {
  const row = await db.crmSocialConnection.findUnique({
    where: { companyId_channel: { companyId: id, channel } },
  });
  if (!row) return null;
  const seat = await db.crmSeat.findFirst({
    where: { companyId: id, id: row.memberId, active: true },
  });
  if (
    row.state !== "CONNECTED" ||
    !row.readyAt ||
    !seat ||
    (row.expiresAt && row.expiresAt < new Date())
  )
    fail("Bu sosial hesabı Ayarlar bölməsində yenidən qoşun.", 503);
  const secret = decode(row.secret);
  return { row, token: secret.accessToken };
}
export async function checkSocialConnection(
  connection: Awaited<ReturnType<typeof prisma.crmSocialConnection.findUnique>>,
  refresh = false,
) {
  if (
    !connection ||
    !connection.secret ||
    !connection.readyAt ||
    connection.state === "DISCONNECTED" ||
    connection.state === "CONNECTING"
  )
    return { ok: false };
  const channel = socialChannel(connection.channel);
  try {
    const secret = decode(connection.secret);
    if (channel === "INSTAGRAM") {
      if (
        refresh &&
        secret.expiresAt &&
        secret.expiresAt < Date.now() + 7 * 86400000 &&
        secret.issuedAt < Date.now() - 86400000
      ) {
        const url = new URL("https://graph.instagram.com/refresh_access_token");
        url.search = new URLSearchParams({
          grant_type: "ig_refresh_token",
          access_token: secret.accessToken,
        }).toString();
        const result = await metaJSON(url.toString());
        if (!result.access_token || !Number(result.expires_in))
          throw new SocialError("RECONNECT_REQUIRED");
        secret.accessToken = String(result.access_token);
        secret.expiresAt = Date.now() + Number(result.expires_in) * 1000;
        secret.issuedAt = Date.now();
      }
      const profile = await metaJSON(
        graph(channel, "me?fields=user_id,username"),
        secret.accessToken,
      );
      if (String(profile.user_id || profile.id || "") !== connection.externalId)
        throw new SocialError("RECONNECT_REQUIRED");
    } else {
      await debugMeta(secret.accessToken, channel);
      await metaJSON(
        graph(channel, connection.externalId + "?fields=id"),
        secret.accessToken,
      );
    }
    if (secret.expiresAt && secret.expiresAt < Date.now())
      throw new SocialError("RECONNECT_REQUIRED");
    const result = await prisma.crmSocialConnection.updateMany({
      where: {
        id: connection.id,
        secret: connection.secret,
        state: { in: ["CONNECTED", "RECONNECT_REQUIRED", "ERROR"] },
      },
      data: {
        state: "CONNECTED",
        secret: encrypt(JSON.stringify(secret)),
        expiresAt: secret.expiresAt ? new Date(secret.expiresAt) : null,
        lastCheckedAt: new Date(),
        errorCode: null,
      },
    });
    return { ok: Boolean(result.count) };
  } catch (e) {
    const code = errorCode(e);
    await prisma.crmSocialConnection.updateMany({
      where: {
        id: connection.id,
        secret: connection.secret,
        state: { not: "DISCONNECTED" },
      },
      data: {
        state: code === "RECONNECT_REQUIRED" ? "RECONNECT_REQUIRED" : "ERROR",
        errorCode: code,
        lastCheckedAt: new Date(),
      },
    });
    return { ok: false, error: socialErrorText(code) };
  }
}
export async function verifySocial(u: Actor, id: string, connectionId: string) {
  const row = await tx(async (db) => {
    const c = await guard(db, u, id, true);
    write(c, "messages");
    const r = await db.crmSocialConnection.findFirst({
      where: { id: connectionId, companyId: id },
    });
    if (!r) fail("Bağlantı tapılmadı.", 404);
    if (r.lastCheckedAt && r.lastCheckedAt.getTime() > Date.now() - 30000)
      fail("30 saniyə sonra yenidən yoxlayın.", 429);
    return r;
  });
  return checkSocialConnection(row, true);
}
export async function maintainSocial(deadline: number) {
  await prisma.crmSocialAuth.updateMany({
    where: { expiresAt: { lt: new Date() }, secret: { not: null } },
    data: { secret: null, state: "EXPIRED", errorCode: "EXPIRED" },
  });
  const stale = await prisma.crmSocialConnection.findMany({
    where: {
      state: "CONNECTING",
      updatedAt: { lt: new Date(Date.now() - 600000) },
    },
    take: 100,
  });
  for (const item of stale)
    await prisma.crmSocialConnection.updateMany({
      where: { id: item.id, state: "CONNECTING", updatedAt: item.updatedAt },
      data: { state: "ERROR", errorCode: "PROVIDER_UNAVAILABLE" },
    });
  const rows = await prisma.crmSocialConnection.findMany({
    where: {
      state: "CONNECTED",
      OR: [
        { lastCheckedAt: null },
        { lastCheckedAt: { lt: new Date(Date.now() - 86400000) } },
      ],
    },
    take: 3,
    orderBy: { lastCheckedAt: "asc" },
  });
  for (const row of rows) {
    if (Date.now() > deadline - 8500) break;
    const company = await prisma.crmCompany.findUnique({
        where: { id: row.companyId },
      }),
      member = await prisma.crmSeat.findFirst({
        where: { companyId: row.companyId, id: row.memberId, active: true },
      });
    if (!member || !company || !company.features.includes("messages") || !["ACTIVE", "TRIAL"].includes(state(company)))
      continue;
    await checkSocialConnection(row, true);
  }
}
