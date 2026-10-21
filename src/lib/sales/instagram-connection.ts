import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";
import { sha, reject } from "./offer-policy";
import {
  instagramConfig,
  exchangeInstagram,
  igJSON,
  graph,
  form,
  encrypt,
  decrypt,
} from "./instagram-api";
export const igTx = <T>(fn: (db: Prisma.TransactionClient) => Promise<T>) =>
  prisma.$transaction(fn, { timeout: 15000 });
export async function igLock(db: Prisma.TransactionClient) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(73021109)`;
}
export type InstagramActor = { id: string; role: string };
async function sessionHash(userId: string) {
  const raw = (await cookies()).get("new-era-session")?.value;
  if (!raw) reject("Daxil olun.", 401);
  const hash = sha(raw),
    s = await prisma.session.findUnique({ where: { tokenHash: hash } });
  if (!s || s.userId !== userId || s.expiresAt <= new Date())
    reject("Sessiya bitib.", 401);
  return hash;
}
export function superAdmin(u: InstagramActor) {
  if (u.role !== "SUPER_ADMIN")
    reject("Instagram hesabını yalnız Super Admin idarə edir.", 403);
}
export async function channelAudit(
  db: Prisma.TransactionClient,
  u: string,
  type: string,
  data: Record<string, string> = {},
) {
  await db.crmPlatformLog.create({
    data: { actorId: u, data: { module: "SALES_INSTAGRAM", type, ...data } },
  });
}
export async function instagramStatus(u: InstagramActor, attempt?: string) {
  const cfg = instagramConfig(false),
    account = await prisma.salesInstagramAccount.findUnique({
      where: { id: "PLATFORM" },
      select: {
        configHash: true,
        externalId: true,
        displayName: true,
        state: true,
        expiresAt: true,
        lastWebhookAt: true,
        errorCode: true,
      },
    });
  let pending = null;
  if (attempt && u.role === "SUPER_ADMIN") {
    const p = await prisma.salesInstagramAuth.findUnique({
      where: { id: attempt },
    });
    if (
      p &&
      p.userId === u.id &&
      p.sessionHash === (await sessionHash(u.id)) &&
      p.state === "REVIEW" &&
      p.expiresAt > new Date()
    )
      pending = {
        id: p.id,
        displayName: p.displayName,
        externalId: p.externalId,
      };
  }
  return {
    configured: cfg.configured,
    missing: u.role === "SUPER_ADMIN" ? cfg.missing : [],
    canManage: u.role === "SUPER_ADMIN",
    account: account
      ? {
          externalId: account.externalId,
          displayName: account.displayName,
          expiresAt: account.expiresAt,
          lastWebhookAt: account.lastWebhookAt,
          errorCode: account.errorCode,
          state:
            account.configHash !== cfg.configHash
              ? "RECONNECT_REQUIRED"
              : account.state === "CONNECTED" && account.expiresAt <= new Date()
                ? "EXPIRED"
                : account.state,
        }
      : null,
    pending,
  };
}
export async function beginInstagram(u: InstagramActor) {
  superAdmin(u);
  const cfg = instagramConfig(),
    sh = await sessionHash(u.id),
    raw = randomBytes(32).toString("hex");
  const p = await igTx(async (db) => {
    await igLock(db);
    if (
      (await db.salesInstagramAuth.count({
        where: {
          userId: u.id,
          createdAt: { gte: new Date(Date.now() - 600000) },
        },
      })) >= 5
    )
      reject("Qoşulmanı bir qədər sonra yenidən başladın.", 429);
    await db.salesInstagramAuth.updateMany({
      where: { userId: u.id, state: { in: ["PENDING", "REVIEW"] } },
      data: { state: "INVALIDATED", secret: null },
    });
    return db.salesInstagramAuth.create({
      data: {
        configHash: cfg.configHash,
        userId: u.id,
        sessionHash: sh,
        stateHash: sha(raw),
        expiresAt: new Date(Date.now() + 600000),
      },
    });
  });
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: cfg.callback,
    response_type: "code",
    scope: "instagram_business_basic,instagram_business_manage_messages",
    state: p.id + "." + raw,
    enable_fb_login: "0",
    force_authentication: "1",
  }).toString();
  return { url: url.toString() };
}
export async function callbackInstagram(
  u: InstagramActor,
  params: URLSearchParams,
) {
  superAdmin(u);
  const state = params.get("state") || "",
    code = params.get("code") || "";
  if (state.length > 200 || code.length > 4096)
    reject("Qoşulma sorğusu düzgün deyil.");
  const [id, raw] = state.split(".");
  if (!id || !raw || !/^[a-f0-9]{64}$/.test(raw))
    reject("Qoşulma sorğusu düzgün deyil.", 403);
  const sh = await sessionHash(u.id);
  await igTx(async (db) => {
    await igLock(db);
    const p = await db.salesInstagramAuth.findUnique({ where: { id } });
    if (
      !p ||
      p.userId !== u.id ||
      p.sessionHash !== sh ||
      p.configHash !== instagramConfig().configHash ||
      p.state !== "PENDING" ||
      p.stateHash !== sha(raw) ||
      p.expiresAt <= new Date()
    )
      reject("Qoşulma müddəti bitib və ya sessiya uyğun deyil.", 403);
    await db.salesInstagramAuth.update({
      where: { id },
      data: { state: "EXCHANGING" },
    });
  });
  try {
    if (params.has("error") || !code)
      reject("Instagram icazəsi verilmədi. Yenidən başlayın.");
    const v = await exchangeInstagram(code);
    await igTx(async (db) => {
      await igLock(db);
      const p = await db.salesInstagramAuth.findUnique({ where: { id } });
      if (
        !p ||
        p.state !== "EXCHANGING" ||
        p.configHash !== instagramConfig().configHash ||
        p.expiresAt <= new Date()
      )
        reject("Qoşulma müddəti bitib.", 409);
      const tenant = await db.crmSocialConnection.findFirst({
        where: {
          channel: "INSTAGRAM",
          externalId: v.externalId,
          state: { not: "DISCONNECTED" },
        },
      });
      if (tenant)
        reject(
          "Bu hesab şirkət Workspace-inə bağlıdır. Platforma üçün ayrıca hesab seçin.",
          409,
        );
      await db.salesInstagramAuth.update({
        where: { id },
        data: {
          state: "REVIEW",
          externalId: v.externalId,
          subjectId: v.subjectId,
          displayName: v.displayName,
          secret: encrypt(v.accessToken),
          tokenExpiresAt: v.expiresAt,
        },
      });
    });
    return { attempt: id };
  } catch (e) {
    await prisma.salesInstagramAuth.updateMany({
      where: { id, state: "EXCHANGING" },
      data: { state: "FAILED", secret: null },
    });
    throw e;
  }
}
export async function confirmInstagram(u: InstagramActor, b: any) {
  superAdmin(u);
  if (b.confirm !== true)
    reject("Hesabın platformaya qoşulmasını təsdiqləyin.");
  instagramConfig();
  const sh = await sessionHash(u.id);
  const claimed = await igTx(async (db) => {
    await igLock(db);
    const p = await db.salesInstagramAuth.findUnique({
      where: { id: String(b.attempt || "") },
    });
    if (
      !p ||
      p.userId !== u.id ||
      p.sessionHash !== sh ||
      p.configHash !== instagramConfig().configHash ||
      p.state !== "REVIEW" ||
      p.expiresAt <= new Date() ||
      !p.secret ||
      !p.tokenExpiresAt ||
      p.tokenExpiresAt <= new Date() ||
      !p.externalId
    )
      reject("Qoşulmanı yenidən başladın.", 409);
    if (
      await db.crmSocialConnection.findFirst({
        where: {
          channel: "INSTAGRAM",
          externalId: p.externalId,
          state: { not: "DISCONNECTED" },
        },
      })
    )
      reject("Bu hesab şirkət Workspace-inə bağlıdır.", 409);
    await db.salesInstagramAuth.update({
      where: { id: p.id },
      data: { state: "SUBSCRIBING" },
    });
    return p;
  });
  try {
    const response = await igJSON(
      graph("me/subscribed_apps"),
      decrypt(claimed.secret!),
      form({ subscribed_fields: "messages" }),
    );
    if (response.success !== true)
      reject("Instagram mesaj abunəliyi təsdiqlənmədi.", 503);
    await igTx(async (db) => {
      await igLock(db);
      const p = await db.salesInstagramAuth.findUnique({
        where: { id: claimed.id },
      });
      if (
        !p ||
        p.state !== "SUBSCRIBING" ||
        p.configHash !== instagramConfig().configHash ||
        p.expiresAt <= new Date()
      )
        reject("Qoşulma müddəti bitib.", 409);
      if (
        await db.crmSocialConnection.findFirst({
          where: {
            channel: "INSTAGRAM",
            externalId: p.externalId!,
            state: { not: "DISCONNECTED" },
          },
        })
      )
        reject("Hesab başqa şirkətə bağlıdır.", 409);
      const data = {
        configHash: instagramConfig().configHash,
        externalId: p.externalId!,
        subjectId: p.subjectId || p.externalId!,
        displayName: p.displayName || p.externalId!,
        secret: p.secret!,
        expiresAt: p.tokenExpiresAt!,
        revision: randomUUID(),
        state: "CONNECTED",
        errorCode: null,
        connectedAt: new Date(),
        lastWebhookAt: null,
      };
      await db.salesInstagramAccount.upsert({
        where: { id: "PLATFORM" },
        create: { id: "PLATFORM", ...data },
        update: data,
      });
      await db.salesInstagramAuth.update({
        where: { id: p.id },
        data: { state: "USED", secret: null },
      });
      await channelAudit(db, u.id, "CONNECTED", {
        externalId: data.externalId,
      });
    });
    return { ok: true };
  } catch (e) {
    await prisma.salesInstagramAuth.updateMany({
      where: { id: claimed.id, state: "SUBSCRIBING" },
      data: { state: "FAILED", secret: null },
    });
    throw e;
  }
}
export async function disconnectInstagram(u: InstagramActor, b: any) {
  superAdmin(u);
  if (b.confirm !== true) reject("Bağlantının kəsilməsini təsdiqləyin.");
  return igTx(async (db) => {
    await igLock(db);
    await db.salesInstagramAccount.updateMany({
      where: { id: "PLATFORM" },
      data: { secret: "", state: "DISCONNECTED", revision: randomUUID() },
    });
    await db.salesInstagramAuth.updateMany({
      where: {
        state: { in: ["PENDING", "REVIEW", "EXCHANGING", "SUBSCRIBING"] },
      },
      data: { state: "INVALIDATED", secret: null },
    });
    await channelAudit(db, u.id, "DISCONNECTED");
    return { ok: true };
  });
}
