import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { fail, required } from "./policy";
function key() {
  const raw = process.env.CRM_ENCRYPTION_KEY || "",
    k = /^[a-f0-9]{64}$/i.test(raw)
      ? Buffer.from(raw, "hex")
      : Buffer.from(raw, "base64");
  if (k.length !== 32)
    fail("İki mərhələli giriş üçün server şifrələmə açarı qurulmalıdır.", 503);
  return k;
}
export function encrypt(value: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  return Buffer.concat([
    iv,
    cipher.update(value, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64");
}
export function decrypt(value: string) {
  const b = Buffer.from(value, "base64");
  if (b.length < 29) fail("Şifrəli məlumat düzgün deyil.", 503);
  const d = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(-16));
  return Buffer.concat([d.update(b.subarray(12, -16)), d.final()]).toString();
}
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32(b: Buffer) {
  let bits = 0,
    value = 0,
    out = "";
  for (const byte of b) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}
function unbase32(s: string) {
  let bits = 0,
    value = 0;
  const out = [];
  for (const ch of s) {
    const n = alphabet.indexOf(ch);
    if (n < 0) fail("TOTP açarı düzgün deyil.");
    value = (value << 5) | n;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
export function totp(secret: string, counter: number) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", unbase32(secret)).update(b).digest(),
    offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
async function session(userId: string) {
  const jar = await cookies(),
    raw = jar.get("new-era-session")?.value;
  if (!raw) fail("Daxil olun.", 401);
  const hash = digest(raw);
  return (
    (await prisma.session.findFirst({
      where: { userId, tokenHash: hash, expiresAt: { gt: new Date() } },
    })) || fail("Sessiya bitib.", 401)
  );
}
export async function ensureSecondFactor(userId: string) {
  const security = await prisma.crmAccountSecurity.findUnique({
    where: { userId },
  });
  if (!security?.enabled) return;
  const s = await session(userId);
  if (
    !(await prisma.crmMfaProof.findFirst({
      where: {
        sessionHash: s.tokenHash,
        userId,
        expiresAt: { gt: new Date() },
      },
    }))
  )
    fail("İki mərhələli təsdiq tələb olunur. [MFA_REQUIRED]", 403);
}
async function failed(userId: string) {
  await prisma.$executeRaw`UPDATE "CrmAccountSecurity" SET "failedAttempts"="failedAttempts"+1, "lockedUntil"=CASE WHEN "failedAttempts"+1>=5 THEN NOW()+INTERVAL '15 minutes' ELSE "lockedUntil" END, "updatedAt"=NOW() WHERE "userId"=${userId}`;
}
export async function account(
  user: { id: string; email: string | null; passwordHash: string },
  b?: Record<string, unknown>,
) {
  const current = await session(user.id),
    s = await prisma.crmAccountSecurity.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });
  if (!b) {
    const sessions = await prisma.session.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      select: { id: true, expiresAt: true, createdAt: true, tokenHash: true },
      orderBy: { createdAt: "desc" },
    });
    return {
      enabled: s.enabled,
      configured: Boolean(process.env.CRM_ENCRYPTION_KEY),
      verified: Boolean(
        await prisma.crmMfaProof.findFirst({
          where: {
            sessionHash: current.tokenHash,
            userId: user.id,
            expiresAt: { gt: new Date() },
          },
        }),
      ),
      sessions: sessions.map((x) => ({
        id: x.id,
        createdAt: x.createdAt,
        expiresAt: x.expiresAt,
        current: x.tokenHash === current.tokenHash,
      })),
    };
  }
  const action = required(b.action);
  if (s.lockedUntil && s.lockedUntil > new Date())
    fail("Çox cəhd edildi. 15 dəqiqə sonra yenidən yoxlayın.", 429);
  if (action === "challenge" || action === "enable") {
    const encrypted = action === "enable" ? s.pendingSecret : s.secret;
    if (!encrypted) fail("İki mərhələli giriş qurulmayıb.");
    const code = required(b.code, 30),
      counter = Math.floor(Date.now() / 30000);
    const recovery =
      action === "challenge" && s.recoveryHashes.includes(digest(code));
    let match = -1;
    for (let n = counter - 1; n <= counter + 1; n++) {
      if (recovery) break;
      const expected = Buffer.from(totp(decrypt(encrypted), n)),
        actual = Buffer.from(code);
      if (
        actual.length === expected.length &&
        timingSafeEqual(actual, expected)
      )
        match = n;
    }
    if ((match < 0 || BigInt(match) <= s.lastCounter) && !recovery) {
      await failed(user.id);
      fail("Kod düzgün deyil və ya artıq istifadə olunub.", 400);
    }
    const codes =
      action === "enable"
        ? Array.from({ length: 8 }, () => randomBytes(8).toString("hex"))
        : [];
    await prisma.$transaction(async (db) => {
      const result = await db.crmAccountSecurity.updateMany({
        where: {
          userId: user.id,
          lastCounter: s.lastCounter,
          updatedAt: s.updatedAt,
        },
        data: {
          failedAttempts: 0,
          lockedUntil: null,
          ...(!recovery
            ? { lastCounter: BigInt(match) }
            : {
                recoveryHashes: {
                  set: s.recoveryHashes.filter((x) => x !== digest(code)),
                },
              }),
          ...(action === "enable"
            ? {
                enabled: true,
                secret: s.pendingSecret,
                pendingSecret: null,
                recoveryHashes: codes.map(digest),
              }
            : {}),
        },
      });
      if (!result.count)
        fail("Kod paralel istifadə edildi. Yenidən cəhd edin.", 409);
      await db.crmMfaProof.upsert({
        where: { sessionHash: current.tokenHash },
        create: {
          sessionHash: current.tokenHash,
          userId: user.id,
          expiresAt: new Date(
            Math.min(current.expiresAt.getTime(), Date.now() + 12 * 3600000),
          ),
        },
        update: {
          expiresAt: new Date(
            Math.min(current.expiresAt.getTime(), Date.now() + 12 * 3600000),
          ),
        },
      });
    });
    return { ok: true, recoveryCodes: codes };
  }
  if (!verifyPassword(required(b.password, 500), user.passwordHash)) {
    await failed(user.id);
    fail("Şifrə düzgün deyil.", 403);
  }
  if (s.enabled) await ensureSecondFactor(user.id);
  if (action === "setup") {
    const secret = base32(randomBytes(20));
    await prisma.crmAccountSecurity.update({
      where: { userId: user.id },
      data: { pendingSecret: encrypt(secret), failedAttempts: 0 },
    });
    return {
      secret,
      uri: `otpauth://totp/${encodeURIComponent("NEW ERA Workspace:" + user.email)}?secret=${secret}&issuer=NEW%20ERA%20Workspace&algorithm=SHA1&digits=6&period=30`,
    };
  }
  if (action === "disable") {
    await prisma.$transaction([
      prisma.crmAccountSecurity.update({
        where: { userId: user.id },
        data: {
          enabled: false,
          secret: null,
          pendingSecret: null,
          recoveryHashes: [],
          lastCounter: BigInt(-1),
          failedAttempts: 0,
        },
      }),
      prisma.crmMfaProof.deleteMany({ where: { userId: user.id } }),
    ]);
    return { ok: true };
  }
  if (action === "revoke") {
    if (b.sessionId === current.id)
      fail("Cari sessiyadan profil menyusu ilə çıxın.");
    await prisma.session.deleteMany({
      where: { id: required(b.sessionId), userId: user.id },
    });
    return { ok: true };
  }
  fail("Əməliyyat uyğun deyil.");
}
