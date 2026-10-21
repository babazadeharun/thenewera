// Disposable database; Meta and SMTP are fixtures. No real Instagram messages or logins.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  Module = require("node:module"),
  crypto = require("node:crypto"),
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
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "new-era-instagram-"));
  let baseline = fs.readFileSync("prisma/schema.prisma", "utf8");
  for (const m of [
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
  baseline = baseline.replace(
    /^.*instagramDeliveries\s+SalesInstagramDelivery\[\].*\n/gm,
    "",
  );
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
    `INSERT INTO "SalesDeal" (id,title,"updatedAt") VALUES ('legacy-sale','Unchanged sale',NOW())`,
  );
  await pg.exec(
    fs.readFileSync(
      "prisma/migrations/20261021160000_sales_instagram/migration.sql",
      "utf8",
    ),
  );
  const server = new PGLiteSocketServer({
    db: pg,
    host: "127.0.0.1",
    port: 55447,
  });
  await server.start();
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@127.0.0.1:55447/postgres?connection_limit=1";
  Object.assign(process.env, {
    SALES_OFFER_SECRET: "offer-key-test-only-1234567890123456789",
    SALES_OFFER_APP_URL: "https://thenewera.space",
    SALES_INSTAGRAM_APP_ID: "1111111",
    SALES_INSTAGRAM_APP_SECRET: "test-secret-not-real",
    SALES_INSTAGRAM_GRAPH_VERSION: "v25.0",
    SALES_INSTAGRAM_WEBHOOK_VERIFY_TOKEN:
      "verify-test-key-not-real-1234567890123456789",
    CRM_ENCRYPTION_KEY: "12".repeat(32),
    CRM_INSTAGRAM_APP_ID: "2222222",
  });
  const { PrismaClient } = require("@prisma/client"),
    db = new PrismaClient();
  let current = null,
    mfaBlocked = false,
    cookie = "fixture-cookie",
    checks = 0,
    mode = "ok",
    profileExternal = "9000001",
    sendCalls = [],
    providerCalls = [],
    delay = null;
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
  const originalLoad = Module._load;
  let security;
  Module._load = function (name, parent, main) {
    if (name === "@/lib/prisma") return { prisma: db };
    if (name === "@/lib/auth") return { getCurrentUser: async () => current };
    if (name === "next/headers")
      return {
        cookies: async () => ({
          get: (n) =>
            n === "new-era-session" && cookie ? { value: cookie } : undefined,
        }),
      };
    if (name === "@/lib/crm/security")
      return {
        ...security,
        ensureSecondFactor: async () => {
          if (mfaBlocked) throw { status: 403, message: "MFA required" };
        },
      };
    if (name.startsWith("@/")) name = path.resolve(root, "src", name.slice(2));
    return originalLoad.call(this, name, parent, main);
  };
  security = require("../src/lib/crm/security.ts");
  const originalFetch = global.fetch;
  global.fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    assert(
      ["api.instagram.com", "graph.instagram.com"].includes(u.hostname),
      "Unexpected real network",
    );
    providerCalls.push({ url: u.toString(), init });
    if (u.pathname === "/oauth/access_token")
      return Response.json({
        access_token: "fixture-short",
        user_id: "8000001",
      });
    if (u.pathname === "/access_token")
      return Response.json({
        access_token: "fixture-long",
        expires_in: 5000000,
      });
    if (u.pathname.endsWith("/me"))
      return Response.json({
        user_id: profileExternal,
        id: "8000001",
        username: "newera_fixture",
      });
    if (u.pathname.endsWith("/me/subscribed_apps"))
      return Response.json({ success: true });
    if (u.pathname.endsWith("/messages")) {
      const b = JSON.parse(init.body);
      sendCalls.push(b);
      if (delay) await delay;
      if (mode === "timeout") throw Error("sensitive-token-do-not-log");
      if (mode === "reject")
        return Response.json({ error: { code: 10 } }, { status: 400 });
      if (mode === "auth")
        return Response.json({ error: { code: 190 } }, { status: 401 });
      if (mode === "badjson") return new Response("malformed", { status: 200 });
      return Response.json({
        message_id: "sent-fixture-" + sendCalls.length,
        recipient_id: b.recipient.id,
      });
    }
    return Response.json({
      name: "Test Customer",
      username: "customer_fixture",
    });
  };
  const route = require("../app/api/admin/sales/instagram/route.ts"),
    webhook = require("../app/api/sales-instagram/webhook/route.ts"),
    callback = require("../app/api/sales-instagram/callback/route.ts"),
    deauth = require("../app/api/sales-instagram/deauthorize/route.ts"),
    conn = require("../src/lib/sales/instagram-connection.ts"),
    provider = require("../src/lib/sales/instagram-api.ts"),
    policy = require("../src/lib/sales/offer-policy.ts");
  const eq = (a, b) => {
      assert.deepEqual(a, b);
      checks++;
    },
    ok = (a) => {
      assert(a);
      checks++;
    };
  const superuser = await db.user.create({
      data: {
        id: "ig-super",
        email: "super@example.test",
        passwordHash: "fixture",
        role: "SUPER_ADMIN",
        verifiedAt: new Date(),
      },
    }),
    admin = await db.user.create({
      data: {
        id: "ig-admin",
        email: "admin@example.test",
        passwordHash: "fixture",
        role: "ADMIN",
        verifiedAt: new Date(),
      },
    }),
    client = await db.user.create({
      data: {
        id: "ig-owner",
        email: "owner@example.test",
        passwordHash: "fixture",
        role: "CLIENT",
        verifiedAt: new Date(),
      },
    });
  await db.session.create({
    data: {
      userId: superuser.id,
      tokenHash: policy.sha(cookie),
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  async function api(
    b,
    who = superuser,
    query = "",
    origin = "https://thenewera.space",
  ) {
    current = who;
    const r = await route[b ? "POST" : "GET"](
      new Request("https://thenewera.space/api/admin/sales/instagram" + query, {
        method: b ? "POST" : "GET",
        headers: { origin },
        ...(b ? { body: JSON.stringify(b) } : {}),
      }),
    );
    return { status: r.status, ...(await r.json()) };
  }
  function event(
    contact = "7000001",
    mid = crypto.randomUUID(),
    timestamp = Date.now(),
    extra = {},
  ) {
    return {
      sender: { id: contact },
      recipient: { id: profileExternal },
      timestamp,
      message: {
        mid,
        text: "Zəhmət olmasa xidmətlər haqqında təklif göndərin.",
        ...extra,
      },
    };
  }
  function payload(events, account = profileExternal) {
    return { object: "instagram", entry: [{ id: account, messaging: events }] };
  }
  async function incoming(events, signature = true, account = profileExternal) {
    const raw = Buffer.from(JSON.stringify(payload(events, account)));
    const r = await webhook.POST(
      new Request("https://thenewera.space/api/sales-instagram/webhook", {
        method: "POST",
        body: raw,
        headers: {
          "x-hub-signature-256": signature
            ? "sha256=" +
              provider.sign(raw, process.env.SALES_INSTAGRAM_APP_SECRET)
            : "bad",
        },
      }),
    );
    return { status: r.status, ...(await r.json()) };
  }
  async function connect() {
    // Separate test logins simulate independent connection windows.
    await db.salesInstagramAuth.updateMany({
      data: { createdAt: new Date(Date.now() - 600001) },
    });
    const b = await api({ action: "connect" });
    eq(b.status, 200);
    const state = new URL(b.url).searchParams.get("state");
    current = superuser;
    const r = await callback.GET(
      new Request(
        "https://thenewera.space/api/sales-instagram/callback?" +
          new URLSearchParams({ state, code: "fixture-code" }),
      ),
    );
    eq(r.status, 303);
    const attempt = new URL(r.headers.get("location")).searchParams.get(
      "attempt",
    );
    ok(attempt);
    const status = await api(null, superuser, "?attempt=" + attempt);
    eq(status.pending.externalId, profileExternal);
    eq(
      (await api({ action: "confirm-connection", attempt, confirm: true }))
        .status,
      200,
    );
    return { state, attempt };
  }
  async function offer(label = "Offer") {
    const deal = await db.salesDeal.create({
        data: { title: label, email: "recipient@example.test" },
      }),
      p = await db.salesOffer.create({
        data: {
          id: crypto.randomUUID(),
          groupId: deal.id,
          dealId: deal.id,
          version: 1,
          state: "OPEN",
          recipientEmail: "recipient@example.test",
          recipientName: "Nəzrin xanım",
          company: "Harmony Dental",
          title: label,
          introduction: "Intro",
          services: [
            {
              title: "Social media",
              description: "Detailed work",
              deliverables: "12 post, 4 Reels",
              duration: "Monthly",
              exclusions: "Ad budget",
              quantity: 1,
              unitMinor: 75000,
              billing: "MONTHLY",
            },
          ],
          currency: "AZN",
          totalMinor: 75000,
          terms: "Terms",
          expiresAt: new Date(Date.now() + 86400000),
          createdByUserId: superuser.id,
          publishedAt: new Date(),
        },
      });
    await db.salesOffer.update({
      where: { id: p.id },
      data: { tokenHash: policy.sha(policy.tokenFor(p.id)) },
    });
    return p;
  }
  const intro = "Salam, sizin üçün təklif hazırladıq.";
  async function preview(p, thread) {
    const r = await api({
      action: "preview",
      offerId: p.id,
      threadId: thread.id,
      intro,
    });
    eq(r.status, 200);
    return r;
  }
  const send = (p) => ({
    ...p,
    action: "send",
    confirm: true,
    recipientConfirmed: true,
  });
  try {
    eq(
      (await db.salesDeal.findUnique({ where: { id: "legacy-sale" } })).title,
      "Unchanged sale",
    );
    eq((await api(null, null)).status, 403);
    eq((await api(null, client)).status, 403);
    eq((await api({ action: "connect" }, admin)).status, 403);
    mfaBlocked = true;
    eq((await api(null)).status, 403);
    mfaBlocked = false;
    eq(
      (await api({ action: "connect" }, superuser, "", "https://evil.test"))
        .status,
      403,
    );
    const savedSecret = process.env.SALES_INSTAGRAM_APP_SECRET;
    delete process.env.SALES_INSTAGRAM_APP_SECRET;
    let status = await api(null);
    eq(status.configured, false);
    eq((await api({ action: "connect" })).status, 503);
    process.env.SALES_INSTAGRAM_APP_SECRET = savedSecret;
    const crmApp = process.env.CRM_INSTAGRAM_APP_ID;
    process.env.CRM_INSTAGRAM_APP_ID = process.env.SALES_INSTAGRAM_APP_ID;
    eq((await api(null)).configured, false);
    process.env.CRM_INSTAGRAM_APP_ID = crmApp;
    let bad = await webhook.GET(
      new Request(
        "https://thenewera.space/api/sales-instagram/webhook?hub.mode=subscribe&hub.verify_token=no&hub.challenge=1234",
      ),
    );
    eq(bad.status, 403);
    let good = await webhook.GET(
      new Request(
        "https://thenewera.space/api/sales-instagram/webhook?" +
          new URLSearchParams({
            "hub.mode": "subscribe",
            "hub.verify_token":
              process.env.SALES_INSTAGRAM_WEBHOOK_VERIFY_TOKEN,
            "hub.challenge": "1234",
          }),
      ),
    );
    eq(good.status, 200);
    eq(await good.text(), "1234");
    const first = await connect();
    const a = await db.salesInstagramAccount.findUnique({
      where: { id: "PLATFORM" },
    });
    eq(a.state, "CONNECTED");
    ok(!a.secret.includes("fixture-long"));
    eq(security.decrypt(a.secret), "fixture-long");
    eq(await db.crmPlatformLog.count(), 1);
    eq(
      (
        await api({
          action: "confirm-connection",
          attempt: first.attempt,
          confirm: true,
        })
      ).status,
      409,
    );
    current = superuser;
    const replay = await callback.GET(
      new Request(
        "https://thenewera.space/api/sales-instagram/callback?" +
          new URLSearchParams({ state: first.state, code: "fixture-code" }),
      ),
    );
    ok(replay.headers.get("location").includes("error="));
    eq((await api(null)).account.secret, undefined);
    eq((await api(null)).account.configHash, undefined);
    eq((await incoming([event()], false)).status, 403);
    eq(await db.salesInstagramThread.count(), 0);
    eq(
      (
        await incoming([
          event("7000001", undefined, Date.now(), { is_echo: true }),
        ])
      ).received,
      0,
    );
    eq(
      (await incoming([event("7000001", undefined, Date.now() + 120000)]))
        .received,
      0,
    );
    eq((await incoming([event("7000001", undefined, 0)])).received, 0);
    eq((await incoming([event("7000001")], true, "WRONG_ACCOUNT")).received, 0);
    eq(
      (await incoming([{ ...event(), recipient: { id: "wrong" } }])).received,
      0,
    );
    const fixedMid = "same-mid";
    eq(
      (await incoming([event("7000001", fixedMid, Date.now() - 60000)]))
        .received,
      1,
    );
    const thread = await db.salesInstagramThread.findFirst({
        where: { contact: "7000001" },
      }),
      initialAt = thread.lastInboundAt;
    eq((await incoming([event("7000001", fixedMid, Date.now())])).received, 0);
    eq(
      (await db.salesInstagramThread.findUnique({ where: { id: thread.id } }))
        .lastInboundAt,
      initialAt,
    );
    eq(
      (await incoming([event("7000001", undefined, Date.now() - 3600000)]))
        .received,
      1,
    );
    eq(
      (await db.salesInstagramThread.findUnique({ where: { id: thread.id } }))
        .lastInboundAt,
      initialAt,
    );
    eq(
      (await incoming([event("7000002", undefined, Date.now() - 25 * 3600000)]))
        .received,
      1,
    );
    const stale = await db.salesInstagramThread.findFirst({
      where: { contact: "7000002" },
    });
    const p = await offer("Instagram teklif");
    let options = await api(null, superuser, "?offerId=" + p.id);
    eq(options.connected, true);
    eq(options.threads.find((x) => x.id === stale.id).eligible, false);
    eq(
      (
        await api({
          action: "preview",
          offerId: p.id,
          threadId: stale.id,
          intro,
        })
      ).status,
      409,
    );
    eq(
      (
        await api({
          action: "preview",
          offerId: p.id,
          threadId: "unknown",
          intro,
        })
      ).status,
      409,
    );
    eq(sendCalls.length, 0);
    const q = await preview(p, thread);
    eq(q.sender, "@newera_fixture");
    ok(q.body.includes(policy.linkFor(p.id)));
    eq(q.recipient.displayName, "@customer_fixture · Test Customer");
    eq(q.customer.email, p.recipientEmail);
    eq(sendCalls.length, 0);
    eq((await api({ ...send(q), confirm: false })).status, 400);
    eq((await api({ ...send(q), recipientConfirmed: false })).status, 400);
    eq((await api({ ...send(q), intro: "tampered" })).status, 409);
    eq((await api({ ...send(q), threadId: stale.id })).status, 409);
    eq((await api({ ...send(q), expires: Date.now() - 1 })).status, 409);
    eq((await api(send(q), admin)).status, 409);
    eq(sendCalls.length, 0);
    // Duplicate requests send once; receipt is API acceptance rather than fabricated delivery/read status.
    const parallel = await Promise.all([api(send(q)), api(send(q))]);
    eq(sendCalls.length, 1);
    eq(
      parallel.map((x) => x.status),
      [200, 200],
    );
    eq(await db.salesInstagramDelivery.count({ where: { offerId: p.id } }), 1);
    const sent = await db.salesInstagramDelivery.findFirst({
      where: { offerId: p.id },
    });
    eq(sent.state, "API_ACCEPTED");
    eq(sent.contact, thread.contact);
    ok(sent.providerMessageId);
    ok(!sent.intro.includes(policy.tokenFor(p.id)));
    eq(
      (await db.salesDeal.findUnique({ where: { id: p.dealId } }))
        .proposalStatus,
      "SENT",
    );
    eq(
      (await db.salesDeal.findUnique({ where: { id: p.dealId } })).stage,
      "NEW",
    );
    eq((await api(send(q))).duplicate, true);
    eq(sendCalls.length, 1);
    const qAgain = await preview(p, thread);
    eq((await api(send(qAgain))).status, 409);
    const changed = await offer("Changed");
    let c = await preview(changed, thread);
    await db.salesOffer.update({
      where: { id: changed.id },
      data: { state: "SUPERSEDED", tokenHash: null },
    });
    eq((await api(send(c))).status, 409);
    const accepted = await offer("Already accepted");
    c = await preview(accepted, thread);
    await db.salesOffer.update({
      where: { id: accepted.id },
      data: { state: "ACCEPTED" },
    });
    eq((await api(send(c))).status, 409);
    const expired = await offer("Expired");
    c = await preview(expired, thread);
    await db.salesOffer.update({
      where: { id: expired.id },
      data: { expiresAt: new Date(0) },
    });
    eq((await api(send(c))).status, 409);
    const cutoff = await offer("Window expired");
    c = await preview(cutoff, thread);
    await db.salesInstagramThread.update({
      where: { id: thread.id },
      data: { lastInboundAt: new Date(Date.now() - 86400001) },
    });
    eq((await api(send(c))).status, 409);
    await incoming([event("7000001")]);
    const freshThread = await db.salesInstagramThread.findUnique({
      where: { id: thread.id },
    });
    const rejected = await offer("Provider rejected");
    c = await preview(rejected, freshThread);
    mode = "reject";
    eq((await api(send(c))).status, 502);
    eq(
      (
        await db.salesInstagramDelivery.findFirst({
          where: { offerId: rejected.id },
        })
      ).state,
      "REJECTED",
    );
    const callCount = sendCalls.length;
    eq((await api(send(c))).duplicate, true);
    eq(sendCalls.length, callCount);
    mode = "ok";
    c = await preview(rejected, freshThread);
    eq((await api(send(c))).status, 200);
    eq(
      await db.salesInstagramDelivery.count({
        where: { offerId: rejected.id },
      }),
      2,
    );
    const unknown = await offer("Unknown");
    c = await preview(unknown, freshThread);
    mode = "timeout";
    let result = await api(send(c));
    eq(result.status, 502);
    ok(!result.error.includes("sensitive"));
    eq(
      (
        await db.salesInstagramDelivery.findFirst({
          where: { offerId: unknown.id },
        })
      ).state,
      "UNCERTAIN",
    );
    mode = "ok";
    c = await preview(unknown, freshThread);
    const callsBeforeUnknown = sendCalls.length;
    eq((await api(send(c))).status, 409);
    eq(sendCalls.length, callsBeforeUnknown);
    const switched = await offer("Switch account");
    c = await preview(switched, freshThread);
    eq((await api({ action: "disconnect", confirm: true })).status, 200);
    eq((await api(send(c))).status, 503);
    eq(
      (await db.salesInstagramAccount.findUnique({ where: { id: "PLATFORM" } }))
        .secret,
      "",
    );
    eq((await incoming([event("7000001")])).ignored, true);
    profileExternal = "9000002";
    await connect();
    options = await api(null, superuser, "?offerId=" + switched.id);
    eq(options.threads.length, 0);
    eq(
      (
        await api({
          action: "preview",
          offerId: switched.id,
          threadId: thread.id,
          intro,
        })
      ).status,
      409,
    );
    await incoming([event("7100001")]);
    const newThread = await db.salesInstagramThread.findFirst({
      where: { externalId: profileExternal },
    });
    const changedConfig = await offer("Config changed");
    c = await preview(changedConfig, newThread);
    process.env.SALES_INSTAGRAM_APP_SECRET = "rotated";
    eq((await api(send(c))).status, 503);
    eq((await api(null)).account.state, "RECONNECT_REQUIRED");
    process.env.SALES_INSTAGRAM_APP_SECRET = savedSecret;
    const badToken = await offer("Token error");
    c = await preview(badToken, newThread);
    mode = "auth";
    eq((await api(send(c))).status, 502);
    eq(
      (await db.salesInstagramAccount.findUnique({ where: { id: "PLATFORM" } }))
        .state,
      "ERROR",
    );
    mode = "ok";
    await connect();
    const disconnectPayload = {
        algorithm: "HMAC-SHA256",
        user_id: "8000001",
        issued_at: Math.floor(Date.now() / 1000),
      },
      encoded = Buffer.from(JSON.stringify(disconnectPayload)).toString(
        "base64url",
      ),
      signed =
        Buffer.from(provider.sign(encoded, savedSecret), "hex").toString(
          "base64url",
        ) +
        "." +
        encoded;
    const rr = await deauth.POST(
      new Request("https://thenewera.space/api/sales-instagram/deauthorize", {
        method: "POST",
        body: new URLSearchParams({ signed_request: signed }),
      }),
    );
    eq(rr.status, 200);
    eq(
      (await db.salesInstagramAccount.findUnique({ where: { id: "PLATFORM" } }))
        .state,
      "DISCONNECTED",
    );
    // Pending OAuth is bound to both the logged-in user and the original session.
    const start = await api({ action: "connect" });
    const state = new URL(start.url).searchParams.get("state");
    cookie = "another-cookie";
    current = superuser;
    const wrongSession = await callback.GET(
      new Request(
        "https://thenewera.space/api/sales-instagram/callback?" +
          new URLSearchParams({ state, code: "fixture-code" }),
      ),
    );
    ok(wrongSession.headers.get("location").includes("error="));
    cookie = "fixture-cookie";
    // Token expiry and ownership guards stay independent of Workspace role.
    await connect();
    await db.salesInstagramAccount.update({
      where: { id: "PLATFORM" },
      data: { expiresAt: new Date(0) },
    });
    eq((await api(null)).account.state, "EXPIRED");
    eq(
      (
        await api({
          action: "preview",
          offerId: switched.id,
          threadId: newThread.id,
          intro,
        })
      ).status,
      503,
    );
    await connect();
    // Customer Workspace inboxes/tokens never become platform recipients.
    const plan = await db.crmPlan.create({ data: { name: "Tenant fixture" } });
    const company = await db.crmCompany.create({
      data: {
        name: "Private company",
        industry: "Clinic",
        email: "tenant@example.test",
        phone: "123",
        trialEnd: new Date(Date.now() + 86400000),
        planId: plan.id,
        seats: 11,
        bytes: 1000000,
        records: 1000,
        features: ["messages"],
      },
    });
    const seat = await db.crmSeat.create({
      data: { companyId: company.id, userId: client.id, role: "OWNER" },
    });
    const privateConnection = await db.crmSocialConnection.create({
      data: {
        companyId: company.id,
        memberId: seat.id,
        channel: "INSTAGRAM",
        externalId: "9010000",
        displayName: "Private tenant",
        secret: "tenant-encrypted-secret",
        state: "CONNECTED",
      },
    });
    await db.crmEntry.create({
      data: {
        companyId: company.id,
        kind: "messages",
        title: "Private customer message",
        status: "RECEIVED",
        authorId: "SYSTEM",
        data: { channel: "INSTAGRAM", to: "7999999", body: "Do not share" },
      },
    });
    eq((await api(null, client)).status, 403);
    const isolated = await api(null, superuser, "?offerId=" + switched.id);
    ok(!isolated.threads.some((t) => t.contact === "7999999"));
    const oldExternal = profileExternal;
    profileExternal = "9010000";
    const tenantStart = await api({ action: "connect" });
    const tenantState = new URL(tenantStart.url).searchParams.get("state");
    current = superuser;
    const tenantCallback = await callback.GET(
      new Request(
        "https://thenewera.space/api/sales-instagram/callback?" +
          new URLSearchParams({ state: tenantState, code: "fixture-code" }),
      ),
    );
    ok(tenantCallback.headers.get("location").includes("error="));
    eq(
      (await db.salesInstagramAccount.findUnique({ where: { id: "PLATFORM" } }))
        .externalId,
      oldExternal,
    );
    eq(
      (
        await db.crmSocialConnection.findUnique({
          where: { id: privateConnection.id },
        })
      ).secret,
      "tenant-encrypted-secret",
    );
    profileExternal = oldExternal;
    // Explicit retry is limited and stays on the same recipient.
    await incoming([event("7100001")]);
    const limitThread = await db.salesInstagramThread.findUnique({
        where: { id: newThread.id },
      }),
      limited = await offer("Three attempt cap");
    mode = "reject";
    for (let i = 0; i < 3; i++) {
      const v = await preview(limited, limitThread);
      eq((await api(send(v))).status, 502);
    }
    const fourth = await preview(limited, limitThread);
    const previousCalls = sendCalls.length;
    eq((await api(send(fourth))).status, 409);
    eq(sendCalls.length, previousCalls);
    mode = "ok";
    eq((await api({ ...send(q), offerId: limited.id })).status, 409);
    const secretBefore = process.env.SALES_OFFER_SECRET;
    process.env.SALES_OFFER_SECRET = "changed-test-secret-12345678901234567890";
    eq(
      (
        await api({
          action: "preview",
          offerId: limited.id,
          threadId: newThread.id,
          intro,
        })
      ).status,
      409,
    );
    process.env.SALES_OFFER_SECRET = secretBefore;
    // The connection throttle is persisted, not an in-memory/browser counter.
    await db.salesInstagramAuth.updateMany({
      data: { createdAt: new Date(Date.now() - 600001) },
    });
    await db.salesInstagramAuth.createMany({
      data: Array.from({ length: 5 }, () => ({
        configHash: provider.instagramConfig().configHash,
        userId: superuser.id,
        sessionHash: policy.sha(cookie),
        stateHash: crypto.randomBytes(32).toString("hex"),
        state: "FAILED",
        expiresAt: new Date(Date.now() + 600000),
      })),
    });
    eq((await api({ action: "connect" })).status, 429);
    if (process.env.INSTAGRAM_BROWSER_QA)
      await eval(fs.readFileSync(process.env.INSTAGRAM_BROWSER_QA, "utf8"));
    console.log(
      `PASS ${checks} Instagram sales integration assertions (real Prisma/PostgreSQL; mocked Meta).`,
    );
  } finally {
    global.fetch = originalFetch;
    Module._load = originalLoad;
    await db.$disconnect();
    await server.stop();
    await pg.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
