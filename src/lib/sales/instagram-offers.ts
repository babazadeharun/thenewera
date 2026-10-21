import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { linkFor, tokenFor, key, sha, reject } from "./offer-policy";
import {
  instagramConfig,
  igJSON,
  graph,
  sign,
  safeEqual,
  decrypt,
  InstagramProviderError,
} from "./instagram-api";
import { igTx, igLock, type InstagramActor } from "./instagram-connection";
const live = ["OPEN", "CHANGES_REQUESTED", "MEETING_REQUESTED"];
async function connection(db: Prisma.TransactionClient) {
  const cfg = instagramConfig(),
    a = await db.salesInstagramAccount.findUnique({
      where: { id: "PLATFORM" },
    });
  if (
    !a ||
    a.state !== "CONNECTED" ||
    a.expiresAt <= new Date() ||
    a.configHash !== cfg.configHash
  )
    reject("Admin Instagram hesabını qoşun və ya yenidən icazə verin.", 503);
  return a;
}
async function offer(db: Prisma.TransactionClient, id: string) {
  const p = await db.salesOffer.findUnique({ where: { id } });
  if (
    !p ||
    !live.includes(p.state) ||
    !p.tokenHash ||
    p.expiresAt <= new Date()
  )
    reject("Aktiv yayımlanmış təklif seçin.", 409);
  if (p.tokenHash !== sha(tokenFor(p.id)))
    reject(
      "Təklif linkinin imza açarı dəyişib. Əvvəlki açarı bərpa edin və ya yeni versiya hazırlayın.",
      409,
    );
  return p;
}
function within(last: Date) {
  return (
    last.getTime() > Date.now() - 86400000 &&
    last.getTime() <= Date.now() + 60000
  );
}
function introduction(v: unknown) {
  if (typeof v !== "string" || !v.trim() || v.length > 600)
    reject("Mesaj girişini 1–600 simvol daxilində yazın.");
  return v.trim();
}
function rendered(id: string, intro: string) {
  const text = intro + "\n\n" + linkFor(id);
  if ([...text].length >= 1000)
    reject("Instagram mesajı 1000 simvoldan qısa olmalıdır.");
  return text;
}
function approval(data: unknown) {
  return sign(JSON.stringify(data), key());
}
function proofData(
  u: InstagramActor,
  p: any,
  a: any,
  t: any,
  intro: string,
  nonce: string,
  expires: number,
) {
  return [
    u.id,
    p.id,
    p.updatedAt.toISOString(),
    p.tokenHash,
    a.externalId,
    a.revision,
    t.id,
    t.contact,
    t.lastInboundAt.toISOString(),
    sha(rendered(p.id, intro)),
    nonce,
    expires,
  ];
}
export async function instagramOfferOptions(id: string, page = 1, query = "") {
  const p = await prisma.salesOffer.findUnique({ where: { id } });
  if (!p) reject("Təklif tapılmadı.", 404);
  const a = await prisma.salesInstagramAccount.findUnique({
      where: { id: "PLATFORM" },
    }),
    cfg = instagramConfig(false);
  const connected = Boolean(
    cfg.configured &&
      a?.state === "CONNECTED" &&
      a.expiresAt > new Date() &&
      a.configHash === cfg.configHash,
  );
  const where: Prisma.SalesInstagramThreadWhereInput = {
    externalId: a?.externalId || "NO_ACCOUNT",
    ...(query
      ? {
          OR: [
            { displayName: { contains: query, mode: "insensitive" } },
            { lastMessage: { contains: query, mode: "insensitive" } },
            { contact: { contains: query } },
          ],
        }
      : {}),
  };
  const [threads, total, deliveries] = await Promise.all([
    connected
      ? prisma.salesInstagramThread.findMany({
          where,
          orderBy: { lastInboundAt: "desc" },
          skip: (page - 1) * 30,
          take: 30,
        })
      : [],
    connected ? prisma.salesInstagramThread.count({ where }) : 0,
    prisma.salesInstagramDelivery.findMany({
      where: { offerId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        state: true,
        contact: true,
        accountExternalId: true,
        providerMessageId: true,
        errorCode: true,
        createdAt: true,
        finishedAt: true,
      },
    }),
  ]);
  return {
    connected,
    account: a
      ? {
          displayName: a.displayName,
          state: a.expiresAt <= new Date() ? "EXPIRED" : a.state,
        }
      : null,
    threads: threads.map((t) => ({
      id: t.id,
      contact: t.contact,
      displayName: t.displayName,
      lastInboundAt: t.lastInboundAt,
      lastMessage: t.lastMessage,
      eligible: within(t.lastInboundAt),
    })),
    page,
    total,
    deliveries,
    defaultIntro: `Salam, ${p.recipientName}. Sizin üçün hazırladığımız xidmətlər, qiymətlər və əməkdaşlıq şərtləri ilə bu linkdən tanış ola bilərsiniz.`,
  };
}
export async function previewInstagramOffer(u: InstagramActor, b: any) {
  const intro = introduction(b.intro);
  const base = await igTx(async (db) => {
    const a = await connection(db),
      p = await offer(db, String(b.offerId || "")),
      t = await db.salesInstagramThread.findUnique({
        where: { id: String(b.threadId || "") },
      });
    if (!t || t.externalId !== a.externalId || !within(t.lastInboundAt))
      reject("Bu yazışma üçün 24 saatlıq cavab pəncərəsi açıq deyil.", 409);
    return { a, p, t };
  });
  // Only look up the provider profile of a signed inbound sender; never accept an arbitrary username/ID.
  let displayName = base.t.displayName;
  if (
    !base.t.profileCheckedAt ||
    base.t.profileCheckedAt.getTime() < Date.now() - 3600000
  ) {
    try {
      const profile = await igJSON(
        graph(encodeURIComponent(base.t.contact) + "?fields=name,username"),
        decrypt(base.a.secret),
      );
      displayName =
        [
          profile.username ? "@" + String(profile.username) : "",
          profile.name ? String(profile.name) : "",
        ]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 200) || displayName;
      await prisma.salesInstagramThread.update({
        where: { id: base.t.id },
        data: { displayName, profileCheckedAt: new Date() },
      });
    } catch {
      /* Lookup failure does not create a guessed identity. IGSID and signed message stay visible. */
    }
  }
  const expires = Date.now() + 300000,
    nonce = randomUUID();
  return {
    offerId: base.p.id,
    threadId: base.t.id,
    intro,
    nonce,
    expires,
    proof: approval(
      proofData(u, base.p, base.a, base.t, intro, nonce, expires),
    ),
    body: rendered(base.p.id, intro),
    sender: base.a.displayName,
    recipient: {
      contact: base.t.contact,
      displayName,
      lastMessage: base.t.lastMessage,
      lastInboundAt: base.t.lastInboundAt,
    },
    customer: { name: base.p.recipientName, email: base.p.recipientEmail },
    expiresAt: base.p.expiresAt,
  };
}
export async function sendInstagramOffer(u: InstagramActor, b: any) {
  if (b.confirm !== true || b.recipientConfirmed !== true)
    reject(
      "Mətnin göndərilməsini və yazışmanın müştəriyə aid olduğunu ayrıca təsdiqləyin.",
    );
  const intro = introduction(b.intro);
  if (
    typeof b.nonce !== "string" ||
    !/^[a-zA-Z0-9-]{36}$/.test(b.nonce) ||
    typeof b.proof !== "string" ||
    !/^[a-f0-9]{64}$/.test(b.proof) ||
    !Number.isFinite(b.expires)
  )
    reject("Önbaxışı yenidən açın.");
  const requestKey = sha(u.id + ":" + b.nonce);
  const claim = await igTx(async (db) => {
    await igLock(db);
    const prior = await db.salesInstagramDelivery.findUnique({
      where: { requestKey },
    });
    if (prior) {
      if (prior.actorId !== u.id) reject("İcazə yoxdur.", 403);
      if (
        prior.offerId !== String(b.offerId) ||
        prior.threadId !== String(b.threadId) ||
        prior.intro !== intro
      )
        reject("Təkrar sorğunun məzmunu uyğun deyil.", 409);
      return { duplicate: true as const, state: prior.state };
    }
    const a = await connection(db),
      p = await offer(db, String(b.offerId || "")),
      t = await db.salesInstagramThread.findUnique({
        where: { id: String(b.threadId || "") },
      });
    if (
      !t ||
      t.externalId !== a.externalId ||
      !within(t.lastInboundAt) ||
      b.expires <= Date.now() ||
      b.expires > Date.now() + 300000 ||
      !safeEqual(
        b.proof,
        approval(proofData(u, p, a, t, intro, b.nonce, b.expires)),
      )
    )
      reject(
        "Göndəriş önbaxışı dəyişib və ya müddəti bitib. Yenidən yoxlayın.",
        409,
      );
    const priorOffer = await db.salesInstagramDelivery.findMany({
      where: { offerId: p.id },
      orderBy: { createdAt: "desc" },
    });
    if (
      priorOffer.some((x) =>
        ["SENDING", "API_ACCEPTED", "UNCERTAIN"].includes(x.state),
      )
    )
      reject(
        "Bu versiyanın Instagram göndərişi artıq başlayıb. Təkrar göndərilmir.",
        409,
      );
    if (
      priorOffer.length >= 3 ||
      priorOffer.some(
        (x) => x.contact !== t.contact || x.accountExternalId !== a.externalId,
      )
    )
      reject(
        "Bu təklifin alıcısı dəyişdirilə bilməz və ya 3 cəhd limiti dolub.",
        409,
      );
    const count = await db.salesInstagramDelivery.count({
      where: { createdAt: { gte: new Date(Date.now() - 3600000) } },
    });
    if (count >= 30)
      reject("Saatlıq 30 Instagram göndəriş limitinə çatılıb.", 429);
    const row = await db.salesInstagramDelivery.create({
      data: {
        offerId: p.id,
        threadId: t.id,
        accountExternalId: a.externalId,
        accountRevision: a.revision,
        contact: t.contact,
        intro,
        bodyHash: sha(rendered(p.id, intro)),
        requestKey,
        actorId: u.id,
      },
    });
    await db.salesOfferEvent.create({
      data: {
        offerId: p.id,
        type: "INSTAGRAM_ATTEMPT",
        actorId: u.id,
        details: `${a.displayName} → ${t.displayName || t.contact}; cəhd ${priorOffer.length + 1}`,
      },
    });
    return { duplicate: false as const, a, p, t, row };
  });
  if (claim.duplicate)
    return {
      ok: claim.state === "API_ACCEPTED",
      state: claim.state,
      duplicate: true,
    };
  let contacted = false;
  try {
    await igTx(async (db) => {
      await igLock(db);
      const a = await connection(db),
        p = await offer(db, claim.p.id),
        t = await db.salesInstagramThread.findUnique({
          where: { id: claim.t.id },
        });
      if (
        a.revision !== claim.a.revision ||
        !t ||
        !within(t.lastInboundAt) ||
        p.tokenHash !== claim.p.tokenHash
      )
        reject("Göndəriş başlamadan təklif və ya bağlantı dəyişib.", 409);
    });
    const body = rendered(claim.p.id, intro);
    contacted = true;
    const out = await igJSON(
      graph(encodeURIComponent(claim.a.externalId) + "/messages"),
      decrypt(claim.a.secret),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: claim.t.contact },
          message: { text: body },
        }),
      },
    );
    if (
      typeof out.message_id !== "string" ||
      !out.message_id ||
      out.message_id.length > 500 ||
      (out.recipient_id && String(out.recipient_id) !== claim.t.contact)
    )
      throw new InstagramProviderError("UNCERTAIN");
    await igTx(async (db) => {
      await igLock(db);
      await db.salesInstagramDelivery.update({
        where: { id: claim.row.id },
        data: {
          state: "API_ACCEPTED",
          providerMessageId: out.message_id,
          finishedAt: new Date(),
        },
      });
      await db.salesInstagramThread.update({
        where: { id: claim.t.id },
        data: { lastOutboundAt: new Date() },
      });
      await db.salesOfferEvent.create({
        data: {
          offerId: claim.p.id,
          type: "INSTAGRAM_API_ACCEPTED",
          actorId: u.id,
          details: `Instagram API mesajı qəbul etdi. Mesaj ID: ${out.message_id}. Oxunma/çatdırılma təsdiqi deyil.`,
        },
      });
      if (claim.p.dealId) {
        await db.salesActivity.create({
          data: {
            dealId: claim.p.dealId,
            type: "PROPOSAL",
            text: `Onlayn təklif Instagram API tərəfindən qəbul edildi: ${claim.p.title} · v${claim.p.version}. Mesaj ID: ${out.message_id}`,
            createdByUserId: u.id,
          },
        });
        await db.salesDeal.updateMany({
          where: {
            id: claim.p.dealId,
            OR: [
              { proposalStatus: null },
              {
                proposalStatus: {
                  notIn: [
                    "ACCEPTED",
                    "DECLINED",
                    "RESPONDED",
                    "REVISED",
                    "MEETING",
                  ],
                },
              },
            ],
          },
          data: { proposalStatus: "SENT", proposalSentAt: new Date() },
        });
      }
    });
    return { ok: true, state: "API_ACCEPTED" };
  } catch (e) {
    const state = !contacted
        ? "CANCELLED"
        : e instanceof InstagramProviderError && e.kind === "REJECTED"
          ? "REJECTED"
          : "UNCERTAIN",
      code =
        state === "CANCELLED"
          ? "STOPPED_BEFORE_SEND"
          : e instanceof InstagramProviderError && e.reconnect
            ? "RECONNECT_REQUIRED"
            : state === "REJECTED"
              ? "PROVIDER_REJECTED"
              : "RESULT_UNKNOWN";
    await igTx(async (db) => {
      await igLock(db);
      await db.salesInstagramDelivery.updateMany({
        where: { id: claim.row.id, state: "SENDING" },
        data: { state, errorCode: code, finishedAt: new Date() },
      });
      if (e instanceof InstagramProviderError && e.reconnect)
        await db.salesInstagramAccount.updateMany({
          where: { id: "PLATFORM", revision: claim.a.revision },
          data: { state: "ERROR", errorCode: code },
        });
      await db.salesOfferEvent.create({
        data: {
          offerId: claim.p.id,
          type: "INSTAGRAM_" + state,
          actorId: u.id,
          details: code,
        },
      });
    }).catch(() => {});
    reject(
      state === "CANCELLED"
        ? "Göndəriş başlamadan dayandırıldı."
        : state === "REJECTED"
          ? "Instagram göndərişi rədd etdi. İcazələri və cavab pəncərəsini yoxlayın; sonra yeni önbaxışla təsdiqləyin."
          : "Nəticə qeyri-müəyyəndir. Instagram-da yoxlayın; avtomatik təkrar göndərilmir.",
      502,
    );
  }
}
