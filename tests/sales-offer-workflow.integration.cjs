// Disposable PostgreSQL + real Prisma and route handlers. SMTP is mocked; no real messages.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  Module = require("node:module"),
  { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "..");
process.chdir(root);
(async () => {
  const { PGlite } = await import(
      pathToFileURL(
        path.join(
          root,
          ".crm-test-runtime/node_modules/@electric-sql/pglite/dist/index.js",
        ),
      ).href
    ),
    { PGLiteSocketServer } = await import(
      pathToFileURL(
        path.join(
          root,
          ".crm-test-runtime/node_modules/@electric-sql/pglite-socket/dist/index.js",
        ),
      ).href
    );
  const pg = await PGlite.create(),
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "new-era-offer-test-"));
  let baseline = fs.readFileSync("prisma/schema.prisma", "utf8");
  for (const m of [
    "SalesOffer",
    "SalesOfferChallenge",
    "SalesOfferEvent",
    "SalesInstagramAccount",
    "SalesInstagramAuth",
    "SalesInstagramThread",
    "SalesInstagramInbound",
    "SalesInstagramDelivery",
  ])
    baseline = baseline.replace(
      new RegExp("model " + m + " \\{[\\s\\S]*?\\n\\}"),
      "",
    );
  baseline = baseline.replace(/^.*onlineOffers\s+SalesOffer\[\].*\n/gm, "");
  fs.writeFileSync(path.join(tmp, "baseline.prisma"), baseline);
  const sql = require("node:child_process").execFileSync(
    process.execPath,
    [
      require.resolve("prisma/build/index.js"),
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      path.join(tmp, "baseline.prisma"),
      "--script",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused",
      },
    },
  );
  await pg.exec(sql);
  await pg.exec(
    `INSERT INTO "SalesDeal" (id,title,email,"updatedAt") VALUES ('old-deal','Existing sale','client@example.test',NOW())`,
  );
  await pg.exec(
    fs.readFileSync(
      "prisma/migrations/20261021100000_sales_online_offers/migration.sql",
      "utf8",
    ),
  );
  process.env.SALES_OFFER_SECRET =
    "test-offer-key-only-not-production-123456789";
  process.env.SALES_OFFER_APP_URL = "https://thenewera.space";
  const { PrismaClient } = require("@prisma/client"),
    db = await require('./helpers/pglite-prisma.cjs')(pg,root);
  let current = null,
    mfaBlocked = false,
    mailReady = true,
    mailMode = "ok",
    smtpCalls = [],
    checks = 0;
  const ts = require("typescript");
  require.extensions[".ts"] = (m, f) =>
    m._compile(
      ts.transpileModule(fs.readFileSync(f, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          esModuleInterop: true,
        },
      }).outputText,
      f,
    );
  const orig = Module._load;
  Module._load = function (name, parent, main) {
    if (name === "@/lib/prisma") return { prisma: db };
    if (name === "@/lib/auth") return { getCurrentUser: async () => current };
    if (name === "@/lib/crm/security")
      return {
        ensureSecondFactor: async () => {
          if (mfaBlocked) throw { status: 403, message: "MFA required" };
        },
      };
    if (name === "@/lib/mail/smtp")
      return {
        smtpConfigured: () => mailReady,
        sendMail: async (b) => {
          smtpCalls.push(b);
          if (mailMode === "timeout")
            throw Object.assign(Error("private-credentials"), {
              code: "ETIMEDOUT",
            });
          if (mailMode === "reject") return { accepted: [], rejected: b.to };
          return { accepted: b.to, rejected: [] };
        },
      };
    if (name.startsWith("@/")) name = path.resolve(root, "src", name.slice(2));
    return orig.call(this, name, parent, main);
  };
  const route = require("../app/api/admin/sales/offers/route.ts"),
    pub = require("../app/api/offers/[id]/route.ts"),
    policy = require("../src/lib/sales/offer-policy.ts");
  const eq = (a, b) => {
      assert.deepEqual(a, b);
      checks++;
    },
    ok = (a) => {
      assert(a);
      checks++;
    };
  const admin = await db.user.create({
      data: {
        id: "offer-admin",
        email: "admin@example.test",
        passwordHash: "fixture",
        role: "SUPER_ADMIN",
        verifiedAt: new Date(),
      },
    }),
    client = await db.user.create({
      data: {
        id: "offer-owner",
        email: "owner@example.test",
        passwordHash: "fixture",
        verifiedAt: new Date(),
      },
    });
  async function call(
    body,
    who = admin,
    origin = "https://thenewera.space",
    query = "",
  ) {
    current = who;
    const r = await route[body ? "POST" : "GET"](
      new Request("https://thenewera.space/api/admin/sales/offers" + query, {
        method: body ? "POST" : "GET",
        headers: { origin },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
    return { status: r.status, ...(await r.json()) };
  }
  async function publicCall(id, b, origin = "https://thenewera.space") {
    const r = await pub.POST(
      new Request("https://thenewera.space/api/offers/" + id, {
        method: "POST",
        headers: { origin },
        body: JSON.stringify(b),
      }),
      { params: Promise.resolve({ id }) },
    );
    return { status: r.status, ...(await r.json()) };
  }
  const payload = (override = {}) => ({
    action: "save",
    dealId: "old-deal",
    recipientEmail: "client@example.test",
    recipientName: "Test Müştəri",
    company: "Test Klinikası",
    title: "Ətraflı xidmət təklifi",
    introduction: "Giriş",
    services: [
      {
        title: "Sosial media",
        description: "Instagram və Facebook idarəetməsi",
        deliverables: "12 post\n4 Reels\n1 hesabat",
        duration: "Hər ay",
        exclusions: "Reklam büdcəsi daxil deyil",
        quantity: 3,
        unitPrice: "100.10",
        billing: "MONTHLY",
      },
    ],
    currency: "AZN",
    discount: "0.30",
    terms: "Ödəniş ayın sonunda. Reklam büdcəsi ayrıdır.",
    expiresAt: new Date(Date.now() + 86400000 * 10).toISOString(),
    ...override,
  });
  async function createPublish(override = {}) {
    const s = await call(payload(override));
    eq(s.status, 200);
    const p = await call({
      action: "publish",
      id: s.offer.id,
      review: s.review,
      confirm: true,
    });
    eq(p.status, 200);
    return { id: p.offer.id, token: p.link.split("#")[1], offer: p.offer };
  }
  const getCode = () => smtpCalls.at(-1).text.match(/\n\n(\d{6})\n\n/)[1];
  async function otp(p, response = "ACCEPT", message = "") {
    const c = await publicCall(p.id, {
      action: "code",
      token: p.token,
      response,
      message,
    });
    eq(c.status, 200);
    return {
      challengeId: c.challengeId,
      code: getCode(),
      token: p.token,
      action: "confirm",
    };
  }
  try {
    eq(
      (await db.salesDeal.findUnique({ where: { id: "old-deal" } })).title,
      "Existing sale",
    );
    eq((await call(null, null)).status, 403);
    eq((await call(null, client)).status, 403);
    eq((await call(payload(), admin, "https://evil.test")).status, 403);
    mfaBlocked = true;
    eq((await call(payload())).status, 403);
    mfaBlocked = false;
    eq(
      (await call(payload({ recipientEmail: "bad\r\nbcc:x@example.test" })))
        .status,
      400,
    );
    eq(
      (
        await call(
          payload({
            services: [{ ...payload().services[0], unitPrice: "1.001" }],
          }),
        )
      ).status,
      400,
    );
    eq((await call(payload({ discount: "5000" }))).status, 400);
    eq(
      (await call(payload({ expiresAt: new Date(0).toISOString() }))).status,
      400,
    );
    eq((await call(payload({ currency: "BAD" }))).status, 400);
    eq(
      (
        await call(
          payload({ services: [{ ...payload().services[0], quantity: 1.5 }] }),
        )
      ).status,
      400,
    );
    eq(
      (
        await call(
          payload({
            services: [
              ...payload().services,
              { ...payload().services[0], billing: "ONCE" },
            ],
          }),
        )
      ).status,
      400,
    );
    let draft = await call(payload());
    eq(draft.status, 200);
    eq(draft.offer.totalMinor, 30000);
    eq(draft.offer.discountMinor, 30);
    eq(smtpCalls.length, 0);
    eq(draft.offer.tokenHash, undefined);
    eq(
      (
        await publicCall(draft.offer.id, {
          action: "view",
          token: policy.tokenFor(draft.offer.id),
        })
      ).status,
      404,
    );
    eq(
      (
        await call({
          action: "publish",
          id: draft.offer.id,
          review: draft.review,
        })
      ).status,
      400,
    );
    eq(
      (
        await call({
          action: "publish",
          id: draft.offer.id,
          review: "old",
          confirm: true,
        })
      ).status,
      409,
    );
    mailReady = false;
    eq(
      (
        await call({
          action: "publish",
          id: draft.offer.id,
          review: draft.review,
          confirm: true,
        })
      ).status,
      503,
    );
    mailReady = true;
    draft = await call({
      ...payload(),
      id: draft.offer.id,
      updatedAt: draft.offer.updatedAt,
      title: "Saxlanmış təklif",
    });
    eq(draft.status, 200);
    eq(
      (await call({ ...payload(), id: draft.offer.id, updatedAt: "stale" }))
        .status,
      409,
    );
    const published = await call({
      action: "publish",
      id: draft.offer.id,
      review: draft.review,
      confirm: true,
    });
    eq(published.status, 200);
    eq(smtpCalls.length, 0);
    ok(published.link.startsWith("https://thenewera.space/offer/"));
    ok(published.link.includes("#"));
    const p = { id: published.offer.id, token: published.link.split("#")[1] };
    eq(
      (
        await call({
          ...payload(),
          id: p.id,
          updatedAt: published.offer.updatedAt,
        })
      ).status,
      409,
    );
    eq(
      (await publicCall(p.id, { action: "view", token: "0".repeat(64) }))
        .status,
      404,
    );
    eq(
      (
        await publicCall(
          p.id,
          { action: "view", token: p.token },
          "https://evil.test",
        )
      ).status,
      403,
    );
    const view = await publicCall(p.id, { action: "view", token: p.token });
    eq(view.status, 200);
    eq(view.offer.totalMinor, 30000);
    eq(view.offer.recipientEmail, undefined);
    eq(view.offer.events, undefined);
    eq(view.offer.createdByUserId, undefined);
    eq(view.offer.tokenHash, undefined);
    eq(view.offer.services[0].deliverables, "12 post\n4 Reels\n1 hesabat");
    eq(
      (await db.salesOffer.findUnique({ where: { id: p.id } })).firstViewedAt,
      null,
    );
    await publicCall(p.id, { action: "track", token: p.token });
    await publicCall(p.id, { action: "track", token: p.token });
    eq(
      await db.salesOfferEvent.count({
        where: { offerId: p.id, type: "LINK_VIEWED" },
      }),
      1,
    );
    eq((await db.salesOffer.findUnique({ where: { id: p.id } })).state, "OPEN");
    eq(smtpCalls.length, 0);
    eq((await call({ action: "send", id: p.id })).status, 400);
    eq((await call({ action: "send", id: p.id, confirm: true })).status, 200);
    eq(smtpCalls.length, 1);
    eq(
      (await db.salesDeal.findUnique({ where: { id: "old-deal" } }))
        .proposalStatus,
      "SENT",
    );
    ok(smtpCalls[0].text.includes(p.token));
    eq((await call({ action: "send", id: p.id, confirm: true })).status, 409);
    eq(
      (
        await publicCall(p.id, {
          action: "code",
          token: p.token,
          response: "CHANGE",
          message: "",
        })
      ).status,
      400,
    );
    // A new published version revokes old links and pending codes, without mutating old prices.
    const oldChallenge = await otp(p);
    const nextDraft = await call(
      payload({
        discount: "0",
        services: [{ ...payload().services[0], unitPrice: "200" }],
      }),
    );
    eq(nextDraft.offer.version, 2);
    eq(
      (await publicCall(p.id, { action: "view", token: p.token })).status,
      200,
    );
    const nextPub = await call({
      action: "publish",
      id: nextDraft.offer.id,
      review: nextDraft.review,
      confirm: true,
    });
    eq(nextPub.status, 200);
    const p2 = { id: nextPub.offer.id, token: nextPub.link.split("#")[1] };
    eq(
      (await publicCall(p.id, { action: "view", token: p.token })).status,
      404,
    );
    eq((await publicCall(p.id, oldChallenge)).status, 404);
    eq(
      (await db.salesOffer.findUnique({ where: { id: p.id } })).totalMinor,
      30000,
    );
    eq(
      (await db.salesOffer.findUnique({ where: { id: p.id } })).state,
      "SUPERSEDED",
    );
    await db.salesOfferChallenge.updateMany({
      data: { createdAt: new Date(Date.now() - 61000) },
    });
    const c2 = await otp(p2);
    eq(
      (
        await publicCall(p2.id, {
          action: "code",
          token: p2.token,
          response: "ACCEPT",
          message: "",
        })
      ).status,
      429,
    );
    const wrong = c2.code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++)
      eq((await publicCall(p2.id, { ...c2, code: wrong })).status, 400);
    eq(
      (
        await db.salesOfferChallenge.findUnique({
          where: { id: c2.challengeId },
        })
      ).attempts,
      5,
    );
    eq((await publicCall(p2.id, c2)).status, 400);
    eq(
      (await db.salesOffer.findUnique({ where: { id: p2.id } })).state,
      "OPEN",
    );
    await db.salesOfferChallenge.updateMany({
      data: { createdAt: new Date(Date.now() - 61000) },
    });
    const c3 = await otp(p2);
    const camp = await db.salesCampaign.create({
      data: {
        name: "Existing campaign",
        steps: [],
        sender: "hello@example.test",
        replyTo: "hello@example.test",
        origin: "https://thenewera.space",
        configHash: "fixture",
        dailyLimit: 5,
        startHour: 0,
        endHour: 24,
        weekdaysOnly: false,
        createdByUserId: admin.id,
        startsAt: new Date(),
        state: "ACTIVE",
      },
    });
    const rec = await db.salesCampaignRecipient.create({
      data: {
        campaignId: camp.id,
        email: "client@example.test",
        fields: {},
        dealId: "old-deal",
        nextAt: new Date(),
      },
    });
    // Concurrent confirmation is idempotent and does not duplicate the receipt/activity.
    const accepted = await Promise.all([
      publicCall(p2.id, c3),
      publicCall(p2.id, c3),
    ]);
    eq(
      accepted.map((x) => x.status),
      [200, 200],
    );
    eq(
      await db.salesOfferEvent.count({
        where: { offerId: p2.id, type: "ACCEPTED" },
      }),
      1,
    );
    eq(
      (await db.salesDeal.findUnique({ where: { id: "old-deal" } }))
        .proposalStatus,
      "ACCEPTED",
    );
    eq(
      (await db.salesDeal.findUnique({ where: { id: "old-deal" } })).stage,
      "NEW",
    );
    eq(
      (await db.salesCampaignRecipient.findUnique({ where: { id: rec.id } }))
        .state,
      "STOPPED",
    );
    eq(
      (
        await publicCall(p2.id, {
          action: "code",
          token: p2.token,
          response: "ACCEPT",
          message: "",
        })
      ).status,
      409,
    );
    eq(
      (await call({ action: "revoke", id: p2.id, confirm: true })).status,
      409,
    );
    eq((await call(payload())).status, 409);
    async function other(label) {
      const d = await db.salesDeal.create({
        data: { title: label, email: label + "@example.test" },
      });
      return createPublish({ dealId: d.id, recipientEmail: d.email });
    }
    const change = await other("change");
    let c = await otp(change, "CHANGE", "Reels sayını 6 edin.");
    eq((await publicCall(change.id, c)).state, "CHANGES_REQUESTED");
    eq(
      await db.salesActivity.count({
        where: { dealId: change.offer.dealId, type: "FOLLOW_UP" },
      }),
      1,
    );
    const changed = await db.salesOffer.findUnique({
      where: { id: change.id },
    });
    eq(changed.services[0].unitMinor, 10010);
    eq(changed.responseMessage, "Reels sayını 6 edin.");
    const meeting = await other("meeting");
    c = await otp(meeting, "MEETING", "Cümə saat 15:00 görüş istərdim.");
    eq((await publicCall(meeting.id, c)).state, "MEETING_REQUESTED");
    eq(
      await db.salesActivity.count({
        where: { dealId: meeting.offer.dealId, type: "FOLLOW_UP" },
      }),
      1,
    );
    const decline = await other("decline");
    c = await otp(decline, "DECLINE", "");
    eq((await publicCall(decline.id, c)).state, "DECLINED");
    eq(
      (
        await publicCall(decline.id, {
          action: "code",
          token: decline.token,
          response: "ACCEPT",
          message: "",
        })
      ).status,
      409,
    );
    const expires = await other("expires");
    c = await otp(expires);
    await db.salesOffer.update({
      where: { id: expires.id },
      data: { expiresAt: new Date(0) },
    });
    eq(
      (await publicCall(expires.id, { action: "view", token: expires.token }))
        .status,
      410,
    );
    eq((await publicCall(expires.id, c)).status, 410);
    const revoked = await other("revoked");
    c = await otp(revoked);
    eq(
      (await call({ action: "revoke", id: revoked.id, confirm: true })).status,
      200,
    );
    eq((await publicCall(revoked.id, c)).status, 404);
    const broken = await other("broken");
    mailMode = "timeout";
    eq(
      (
        await publicCall(broken.id, {
          action: "code",
          token: broken.token,
          response: "ACCEPT",
          message: "",
        })
      ).status,
      503,
    );
    eq(
      (await db.salesOffer.findUnique({ where: { id: broken.id } })).state,
      "OPEN",
    );
    ok(
      !(
        await publicCall(broken.id, { action: "view", token: broken.token })
      ).error?.includes("credentials"),
    );
    eq(
      (
        await db.salesOfferChallenge.findFirst({
          where: { offerId: broken.id },
        })
      ).state,
      "FAILED",
    );
    eq(
      (await call({ action: "send", id: broken.id, confirm: true })).status,
      503,
    );
    eq(
      (await db.salesOffer.findUnique({ where: { id: broken.id } })).mailState,
      "UNCERTAIN",
    );
    mailMode = "ok";
    const before = smtpCalls.length;
    eq(
      (await call({ action: "send", id: broken.id, confirm: true })).status,
      409,
    );
    eq(smtpCalls.length, before);
    const expiryCode = await other("expiry-code");
    c = await otp(expiryCode);
    await db.salesOfferChallenge.update({
      where: { id: c.challengeId },
      data: { expiresAt: new Date(0) },
    });
    eq((await publicCall(expiryCode.id, c)).status, 400);
    const limit = await other("limits");
    await db.salesOfferChallenge.createMany({
      data: Array.from({ length: 3 }, (_, i) => ({
        offerId: limit.id,
        email: limit.offer.recipientEmail,
        action: "ACCEPT",
        message: "",
        codeHash: "0".repeat(64),
        expiresAt: new Date(),
        createdAt: new Date(Date.now() - (i + 2) * 61000),
      })),
    });
    eq(
      (
        await publicCall(limit.id, {
          action: "code",
          token: limit.token,
          response: "ACCEPT",
          message: "",
        })
      ).status,
      429,
    );
    const appSecret = process.env.SALES_OFFER_SECRET;
    process.env.SALES_OFFER_SECRET = "short";
    eq(
      (await publicCall(change.id, { action: "view", token: change.token }))
        .status,
      503,
    );
    process.env.SALES_OFFER_SECRET = appSecret;
    eq(
      (await call(null, admin, "https://thenewera.space", "?page=-1")).status,
      400,
    );
    const list = await call(null);
    eq(list.status, 200);
    ok(list.items.length > 5);
    eq(list.items[0].tokenHash, undefined);
    const httpRoute = await call(
      null,
      admin,
      "https://thenewera.space",
      "?id=" + p2.id,
    );
    ok(
      httpRoute.offer.events.some(
        (e) => e.type === "ACCEPTED" && e.actorId === null,
      ),
    );
    eq(httpRoute.versions.length, 2);
    eq(httpRoute.versions[1].totalMinor, 30000);
    if (process.env.OFFER_BROWSER_QA)
      await eval(fs.readFileSync(process.env.OFFER_BROWSER_QA, "utf8"));
    const noEmailDeal = await db.salesDeal.create({data:{title:"Instagram lead without email"}});
    const freePayload = payload({dealId:noEmailDeal.id, recipientEmail:"", discount:"0", services:[{...payload().services[0],quantity:1,unitPrice:"0"}]});
    const beforeMail = smtpCalls.length;
    let viewOnly = await call(freePayload);
    eq(viewOnly.status,200); eq(viewOnly.offer.recipientEmail,""); eq(viewOnly.offer.totalMinor,0);
    const originalViewReview=viewOnly.review;
    eq((await call({action:"publish",id:viewOnly.offer.id,review:viewOnly.review,confirm:false})).status,400);
    eq((await call({action:"publish",id:viewOnly.offer.id,review:"stale",confirm:true})).status,409);
    mailReady=false;
    eq((await call({action:"publish",id:viewOnly.offer.id,review:originalViewReview,confirm:true})).status,200);
    eq(smtpCalls.length,beforeMail); mailReady=true;
    let readOnly = await publicCall(viewOnly.offer.id,{action:"view",token:policy.tokenFor(viewOnly.offer.id)});
    eq(readOnly.status,200); eq(readOnly.offer.responseEnabled,false);eq(readOnly.offer.emailHint,undefined);
    eq((await call({action:"send",id:viewOnly.offer.id,confirm:true})).status,409);
    for(const response of ["ACCEPT","DECLINE","CHANGE","MEETING"])
      eq((await publicCall(viewOnly.offer.id,{action:"code",token:policy.tokenFor(viewOnly.offer.id),response,message:"Test",email:"attacker@example.test"})).status,409);
    eq(smtpCalls.length,beforeMail);
    eq(await db.salesOfferChallenge.count({where:{offerId:viewOnly.offer.id}}),0);
    eq((await db.salesOffer.findUnique({where:{id:viewOnly.offer.id}})).state,"OPEN");
    const forged=await db.salesOfferChallenge.create({data:{offerId:viewOnly.offer.id,email:"",action:"ACCEPT",message:"",codeHash:"0".repeat(64),state:"READY",expiresAt:new Date(Date.now()+600000)}});
    await db.salesOfferChallenge.update({where:{id:forged.id},data:{codeHash:policy.otpHash(forged.id,"123456")}});
    eq((await publicCall(viewOnly.offer.id,{action:"confirm",token:policy.tokenFor(viewOnly.offer.id),challengeId:forged.id,code:"123456"})).status,409);
    eq((await db.salesOffer.findUnique({where:{id:viewOnly.offer.id}})).acceptedAt,null);
    eq((await publicCall(viewOnly.offer.id,{action:"view",token:"0".repeat(64)})).status,404);
    eq((await call({...freePayload,id:viewOnly.offer.id,updatedAt:viewOnly.offer.updatedAt,recipientEmail:"new@example.test"})).status,409);
    const newVersion=await call({...freePayload,recipientEmail:"new@example.test"});
    eq(newVersion.status,200);eq(newVersion.offer.version,2);
    eq((await publicCall(viewOnly.offer.id,{action:"view",token:policy.tokenFor(viewOnly.offer.id)})).status,200);
    eq((await call({action:"publish",id:newVersion.offer.id,review:newVersion.review,confirm:true})).status,200);
    eq((await publicCall(viewOnly.offer.id,{action:"view",token:policy.tokenFor(viewOnly.offer.id)})).status,404);
    eq((await publicCall(newVersion.offer.id,{action:"view",token:policy.tokenFor(newVersion.offer.id)})).offer.responseEnabled,true);
    const totals=require("../src/lib/sales/offer-editor.ts").offerEditorTotals;
    eq(totals([{quantity:1,unitPrice:"0"}],"500").totalMinor,null);
    eq(totals([{quantity:1,unitPrice:"500"}],"500").totalMinor,0);
    eq(totals([{quantity:3,unitPrice:"100.10"}],"0.30").totalMinor,30000);
    eq(totals([{quantity:1,unitPrice:"0"}],"0").totalMinor,0);
    for(const unitPrice of ["", "-1","1.234","1e3","Infinity"])eq(totals([{quantity:1,unitPrice}],"0").totalMinor,null);
    console.log(
      `PASS ${checks} online proposal integration assertions (real Prisma/PostgreSQL; mocked SMTP).`,
    );
  } finally {
    Module._load = orig;
    await db.$disconnect();

    await pg.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
