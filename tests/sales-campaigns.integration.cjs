// Real Prisma + disposable PostgreSQL; all SMTP/IMAP are fixtures. No real mail.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  Module = require("node:module");
const root = path.resolve(__dirname, "..");
process.chdir(root);
(async () => {
  const { PGlite } = await import(
      require("node:url").pathToFileURL(
        path.join(
          root,
          ".crm-test-runtime/node_modules/@electric-sql/pglite/dist/index.js",
        ),
      ).href
    ),
    { PGLiteSocketServer } = await import(
      require("node:url").pathToFileURL(
        path.join(
          root,
          ".crm-test-runtime/node_modules/@electric-sql/pglite-socket/dist/index.js",
        ),
      ).href
    );
  const pg = await PGlite.create(),
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "new-era-campaign-"));
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  let baseline = schema;
  for (const m of [
    "SalesCampaign",
    "SalesCampaignRecipient",
    "SalesCampaignDelivery",
    "SalesEmailSuppression",
    "SalesCampaignWorker",
  ])
    baseline = baseline.replace(
      new RegExp("model " + m + " \\{[\\s\\S]*?\\n\\}"),
      "",
    );
  baseline = baseline.replace(
    /^.*campaignRecipients SalesCampaignRecipient\[\].*\n/gm,
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
    `INSERT INTO "SalesDeal" (id,title,"updatedAt") VALUES ('old-deal','Existing manual sale',NOW())`,
  );
  await pg.exec(
    fs.readFileSync(
      "prisma/migrations/20261020133000_sales_email_campaigns/migration.sql",
      "utf8",
    ),
  );
  const server = new PGLiteSocketServer({
    db: pg,
    host: "127.0.0.1",
    port: 55445,
  });
  await server.start();
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@127.0.0.1:55445/postgres?connection_limit=1";
  Object.assign(process.env, {
    SALES_CAMPAIGNS_ENABLED: "true",
    SALES_CAMPAIGN_SECRET: "campaign-signing-key-test-only-123456789",
    SALES_CAMPAIGN_APP_URL: "https://thenewera.space",
    SALES_CAMPAIGN_CRON_SECRET: "cron-key-only-for-testing-1234567890",
    MAIL_FROM_ADDRESS: "hello@thenewera.space",
    MAIL_SMTP_HOST: "smtp.fixture",
    MAIL_SMTP_USER: "hello@thenewera.space",
    MAIL_IMAP_HOST: "imap.fixture",
    MAIL_IMAP_USER: "hello@thenewera.space",
    SALES_CAMPAIGN_DAILY_LIMIT: "50",
  });
  const { PrismaClient } = require("@prisma/client"),
    db = new PrismaClient();
  let current = null,
    count = 0,
    mailReady = true,
    mailFail = false,
    smtpMode = "ok",
    headers = [],
    requests = [],
    smtpCalls = [],
    delaySend = null,
    mfaBlocked = false;
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
  const smtp = {
    smtpConfigured: () => mailReady,
    sendMail: async (b) => {
      smtpCalls.push(b);
      if (delaySend) await delaySend;
      if (smtpMode === "unknown")
        throw Object.assign(Error("private-server-error"), {
          code: "ETIMEDOUT",
        });
      if (smtpMode === "reject") return { accepted: [], rejected: b.to };
      return { messageId: b.messageId, accepted: b.to, rejected: [] };
    },
  };
  const imap = {
    mailConfigured: () => mailReady,
    mailboxFromKey: () => "INBOX",
    withImap: async (fn) => {
      if (mailFail) throw Error("SECRET IMAP CREDENTIALS");
      return fn({
        select: async () => {},
        search: async (q) => {
          requests.push(q);
          return headers.map((h, i) => i + 1);
        },
        fetchOverview: async () => headers,
      });
    },
  };
  Module._load = function (name, parent, main) {
    if (name === "@/lib/prisma") return { prisma: db };
    if (name === "@/lib/auth") return { getCurrentUser: async () => current };
    if (name === "@/lib/crm/security")
      return {
        ensureSecondFactor: async () => {
          if (mfaBlocked) throw { status: 403, message: "MFA required" };
        },
      };
    if (name === "@/lib/mail/smtp") return smtp;
    if (name === "@/lib/mail/imap") return imap;
    if (name.startsWith("@/")) name = path.resolve(root, "src", name.slice(2));
    return orig.call(this, name, parent, main);
  };
  const service = require("../src/lib/sales/campaigns.ts"),
    policy = require("../src/lib/sales/campaign-policy.ts"),
    route = require("../app/api/admin/sales/campaigns/route.ts"),
    cron = require("../app/api/cron/sales-campaigns/route.ts"),
    opt = require("../app/api/sales/email-preferences/route.ts");
  const eq = (a, b) => {
      assert.deepEqual(a, b);
      count++;
    },
    ok = (a) => {
      assert(a);
      count++;
    };
  async function api(
    b,
    who = current,
    origin = "https://thenewera.space",
    query = "",
  ) {
    current = who;
    const r = await route[b ? "POST" : "GET"](
      new Request("https://thenewera.space/api/admin/sales/campaigns" + query, {
        method: b ? "POST" : "GET",
        headers: { origin, "Content-Type": "application/json" },
        ...(b ? { body: JSON.stringify(b) } : {}),
      }),
    );
    return { status: r.status, data: await r.json() };
  }
  async function deal(email, extra = {}) {
    return db.salesDeal.create({
      data: {
        title: "Clinic " + email,
        contactName: "Doctor " + email,
        email,
        proposalStatus: "TODO",
        ...extra,
      },
    });
  }
  const sequence = [
    {
      afterDays: 0,
      subject: "Offer {{company}}",
      body: "Hello {{name}} — {{service}}",
    },
    { afterDays: 3, subject: "Follow up", body: "Follow up {{company}}" },
    { afterDays: 4, subject: "Last follow up", body: "Last message" },
  ];
  async function draft(ds, more = {}) {
    const x = await api(
      {
        action: "create",
        name: "Campaign",
        dealIds: ds.map((d) => d.id),
        steps: sequence,
        dailyLimit: 20,
        startHour: 0,
        endHour: 24,
        weekdaysOnly: false,
        ...more,
      },
      admin,
    );
    eq(x.status, 201);
    return x.data;
  }
  async function approve(x) {
    const a = await api(
      {
        action: "approve",
        id: x.campaign.id,
        reviewKey: x.reviewKey,
        confirm: true,
      },
      admin,
    );
    eq(a.status, 200);
  }
  async function tick() {
    await db.salesCampaignWorker.updateMany({
      data: { nextSendAt: new Date(0) },
    });
    return service.runCampaigns();
  }
  async function pauseAll() {
    await db.salesCampaign.updateMany({
      where: { state: "ACTIVE" },
      data: { state: "PAUSED" },
    });
  }
  const admin = await db.user.create({
      data: {
        email: "admin@fixture.test",
        passwordHash: "fixture",
        role: "SUPER_ADMIN",
        verifiedAt: new Date(),
      },
    }),
    staff = await db.user.create({
      data: {
        email: "staff@fixture.test",
        passwordHash: "fixture",
        role: "ADMIN",
        verifiedAt: new Date(),
      },
    }),
    customer = await db.user.create({
      data: {
        email: "customer@fixture.test",
        passwordHash: "fixture",
        role: "CLIENT",
        verifiedAt: new Date(),
      },
    });
  try {
    eq(
      (await db.salesDeal.findUnique({ where: { id: "old-deal" } })).title,
      "Existing manual sale",
    );
    eq((await api(undefined, null)).status, 403);
    eq((await api(undefined, customer)).status, 403);
    eq(
      (await api({ action: "create" }, admin, "https://evil.test")).status,
      403,
    );
    eq((await api({ action: "create" }, admin, "")).status, 403);
    mfaBlocked = true;
    eq((await api(undefined, admin)).status, 403);
    mfaBlocked = false;
    const alpha = await deal("alpha@example.test"),
      duplicate = await deal("ALPHA@EXAMPLE.TEST"),
      invalid = await deal("bad-address"),
      won = await deal("won@example.test", { stage: "WON" }),
      declined = await deal("decline@example.test", {
        proposalStatus: "DECLINED",
      }),
      suppressed = await deal("unsub@example.test");
    await db.salesEmailSuppression.create({
      data: { email: suppressed.email, reason: "old optout" },
    });
    let d = await draft([alpha, duplicate, invalid, won, declined, suppressed]);
    eq(d.total, 1);
    eq(d.skipped.length, 5);
    eq(smtpCalls.length, 0);
    ok(d.recipients[0].preview[0].text.includes("Doctor"));
    ok(d.recipients[0].preview[0].text.includes("/sales/email-preferences?"));
    ok(!JSON.stringify(d).includes(process.env.SALES_CAMPAIGN_SECRET));
    eq(
      (
        await api(
          { action: "approve", id: d.campaign.id, reviewKey: d.reviewKey },
          admin,
        )
      ).status,
      400,
    );
    eq(
      (
        await api(
          {
            action: "approve",
            id: d.campaign.id,
            reviewKey: "stale",
            confirm: true,
          },
          admin,
        )
      ).status,
      409,
    );
    await approve(d);
    eq(
      (
        await api(
          {
            action: "approve",
            id: d.campaign.id,
            reviewKey: d.reviewKey,
            confirm: true,
          },
          admin,
        )
      ).status,
      409,
    );
    let result = await tick();
    eq(result.sent, 1);
    eq(smtpCalls.length, 1);
    let recipient = await db.salesCampaignRecipient.findUnique({
        where: { id: d.recipients[0].id },
      }),
      sent = await db.salesCampaignDelivery.findMany({
        where: { recipientId: recipient.id },
      });
    eq(recipient.nextStep, 1);
    eq(sent.length, 1);
    eq(sent[0].state, "SENT");
    eq(
      (await db.salesDeal.findUnique({ where: { id: alpha.id } }))
        .proposalStatus,
      "SENT",
    );
    eq(smtpCalls[0].to, ["alpha@example.test"]);
    eq(smtpCalls[0].replyTo, "hello@thenewera.space");
    eq(smtpCalls[0].messageId, sent[0].messageId);
    ok(smtpCalls[0].headers["List-Unsubscribe"]);
    eq((await tick()).sent, 0);
    eq(smtpCalls.length, 1);
    // Linked replies create one follow-up task and stop future reminders.
    headers = [
      {
        from: [{ address: "alpha@example.test" }],
        date: new Date().toISOString(),
        inReplyTo: sent[0].messageId,
        messageId: "<reply1@fixture>",
        autoSubmitted: "no",
      },
    ];
    await db.salesCampaignRecipient.update({
      where: { id: recipient.id },
      data: { nextAt: new Date(0) },
    });
    eq((await tick()).sent, 0);
    eq(
      (
        await db.salesCampaignRecipient.findUnique({
          where: { id: recipient.id },
        })
      ).state,
      "REPLIED",
    );
    eq(
      (await db.salesDeal.findUnique({ where: { id: alpha.id } }))
        .proposalStatus,
      "RESPONDED",
    );
    eq(
      await db.salesActivity.count({
        where: { dealId: alpha.id, type: "FOLLOW_UP" },
      }),
      1,
    );
    await tick();
    eq(
      await db.salesActivity.count({
        where: { dealId: alpha.id, type: "FOLLOW_UP" },
      }),
      1,
    );
    headers = [];
    await pauseAll();
    // Draft cannot bypass global suppression; signed GET only shows a confirmation page.
    const beta = await deal("beta@example.test");
    d = await draft([beta]);
    await approve(d);
    let outUrl = new URL(
      d.recipients[0].preview[0].text.match(/https:\/\/\S+/)[0],
    );
    eq(opt.GET, undefined);
    eq(
      (
        await opt.POST(
          new Request(
            "https://thenewera.space/api/sales/email-preferences?id=" +
              d.recipients[0].id +
              "&sig=bad",
            { method: "POST" },
          ),
        )
      ).status,
      403,
    );
    eq(
      (
        await opt.POST(
          new Request(
            "https://thenewera.space/api/sales/email-preferences" +
              outUrl.search,
            { method: "POST" },
          ),
        )
      ).status,
      200,
    );
    eq(
      (
        await opt.POST(
          new Request(
            "https://thenewera.space/api/sales/email-preferences" +
              outUrl.search,
            { method: "POST" },
          ),
        )
      ).status,
      200,
    );
    eq(
      (
        await db.salesCampaignRecipient.findUnique({
          where: { id: d.recipients[0].id },
        })
      ).state,
      "UNSUBSCRIBED",
    );
    eq(
      await db.salesEmailSuppression.count({ where: { email: beta.email } }),
      1,
    );
    eq((await tick()).sent, 0);
    await pauseAll();
    // A working inbox is required even for initial send. Raw error details are never returned.
    const gamma = await deal("gamma@example.test");
    d = await draft([gamma]);
    await approve(d);
    mailFail = true;
    let before = smtpCalls.length;
    await assert.rejects(tick(), (e) => !e.message.includes("SECRET"));
    count++;
    eq(smtpCalls.length, before);
    eq(
      await db.salesCampaignDelivery.count({
        where: { recipientId: d.recipients[0].id },
      }),
      0,
    );
    mailFail = false;
    eq((await tick()).sent, 1);
    // A timeout is uncertain and never retried, even on subsequent cron runs.
    await pauseAll();
    const uncertain = await deal("unknown@example.test");
    d = await draft([uncertain]);
    await approve(d);
    smtpMode = "unknown";
    before = smtpCalls.length;
    await tick();
    eq(smtpCalls.length, before + 1);
    eq(
      (
        await db.salesCampaignRecipient.findUnique({
          where: { id: d.recipients[0].id },
        })
      ).state,
      "UNCERTAIN",
    );
    await tick();
    eq(smtpCalls.length, before + 1);
    smtpMode = "ok";
    await pauseAll();
    // Parallel workers reserve a single SMTP attempt; repeated cron calls do not duplicate.
    const concurrent = await deal("parallel@example.test");
    d = await draft([concurrent]);
    await approve(d);
    before = smtpCalls.length;
    await db.salesCampaignWorker.updateMany({
      data: { nextSendAt: new Date(0) },
    });
    let release;
    delaySend = new Promise((r) => (release = r));
    const first = service.runCampaigns();
    while (smtpCalls.length === before)
      await new Promise((r) => setTimeout(r, 5));
    const second = await service.runCampaigns();
    eq(second.state, "BUSY");
    release();
    await first;
    delaySend = null;
    eq(smtpCalls.length, before + 1);
    eq(
      await db.salesCampaignDelivery.count({
        where: { recipientId: d.recipients[0].id },
      }),
      1,
    );
    await pauseAll();
    // Do not resend same address across overlapping active/paused campaigns.
    const same = await deal("parallel@example.test");
    let another = await draft([same]);
    eq(
      (
        await api(
          {
            action: "approve",
            id: another.campaign.id,
            reviewKey: another.reviewKey,
            confirm: true,
          },
          admin,
        )
      ).status,
      409,
    );
    await api({ action: "cancel", id: d.campaign.id }, admin);
    await approve(another);
    await api({ action: "cancel", id: another.campaign.id }, admin);
    // Manual meeting/decline and deleted or changed lead data prevent sends.
    const manual = await deal("manual@example.test");
    d = await draft([manual]);
    await approve(d);
    eq(
      (
        await api(
          {
            action: "recipient",
            recipientId: d.recipients[0].id,
            outcome: "meeting",
          },
          admin,
        )
      ).status,
      200,
    );
    eq(
      (await db.salesDeal.findUnique({ where: { id: manual.id } }))
        .proposalStatus,
      "MEETING",
    );
    eq((await tick()).sent, 0);
    await pauseAll();
    const changed = await deal("change@example.test");
    d = await draft([changed]);
    await approve(d);
    await db.salesDeal.update({
      where: { id: changed.id },
      data: { email: "changed@example.test" },
    });
    eq((await tick()).sent, 0);
    eq(
      (
        await db.salesCampaignRecipient.findUnique({
          where: { id: d.recipients[0].id },
        })
      ).state,
      "STOPPED",
    );
    await pauseAll();
    const removed = await deal("deleted@example.test");
    d = await draft([removed]);
    await approve(d);
    await db.salesDeal.delete({ where: { id: removed.id } });
    eq((await tick()).sent, 0);
    eq(
      (
        await db.salesCampaignRecipient.findUnique({
          where: { id: d.recipients[0].id },
        })
      ).dealId,
      null,
    );
    await pauseAll();
    // Server limits and actual SMTP result are enforced.
    const lim1 = await deal("limit1@example.test"),
      lim2 = await deal("limit2@example.test");
    d = await draft([lim1, lim2], { dailyLimit: 1 });
    await approve(d);
    eq((await tick()).sent, 1);
    eq((await tick()).sent, 0);
    await pauseAll();
    const blocked = await deal("suspended@example.test");
    d = await draft([blocked]);
    await approve(d);
    await db.user.update({
      where: { id: admin.id },
      data: { accountStatus: "SUSPENDED" },
    });
    before = smtpCalls.length;
    eq((await tick()).sent, 0);
    eq(smtpCalls.length, before);
    eq(
      (await db.salesCampaign.findUnique({ where: { id: d.campaign.id } }))
        .state,
      "PAUSED",
    );
    await db.user.update({
      where: { id: admin.id },
      data: { accountStatus: "CLIENT" },
    });
    const cfg = await deal("config@example.test");
    d = await draft([cfg]);
    await approve(d);
    process.env.MAIL_FROM_ADDRESS = "other@thenewera.space";
    eq((await tick()).sent, 0);
    eq(
      (await db.salesCampaign.findUnique({ where: { id: d.campaign.id } }))
        .state,
      "PAUSED",
    );
    process.env.MAIL_FROM_ADDRESS = "hello@thenewera.space";
    // Out of office or unthreaded incoming mail pauses conservatively, not a fake sales response.
    const auto = await deal("auto@example.test");
    d = await draft([auto]);
    await approve(d);
    eq((await tick()).sent, 1);
    sent = await db.salesCampaignDelivery.findMany({
      where: { recipientId: d.recipients[0].id },
    });
    headers = [
      {
        from: [{ address: auto.email }],
        date: new Date().toISOString(),
        inReplyTo: sent[0].messageId,
        autoSubmitted: "auto-replied",
      },
    ];
    await db.salesCampaignRecipient.update({
      where: { id: d.recipients[0].id },
      data: { nextAt: new Date(0) },
    });
    eq((await tick()).sent, 0);
    eq(
      (
        await db.salesCampaignRecipient.findUnique({
          where: { id: d.recipients[0].id },
        })
      ).state,
      "REVIEW",
    );
    eq(
      (await db.salesDeal.findUnique({ where: { id: auto.id } }))
        .proposalStatus,
      "SENT",
    );
    headers = [];
    await pauseAll();
    eq(
      policy.inWindow(new Date("2026-10-20T05:00:00Z"), {
        startHour: 9,
        endHour: 18,
        weekdaysOnly: true,
      }),
      true,
    );
    eq(
      policy.inWindow(new Date("2026-10-20T14:00:00Z"), {
        startHour: 9,
        endHour: 18,
        weekdaysOnly: true,
      }),
      false,
    );
    eq(
      policy.inWindow(new Date("2026-10-24T08:00:00Z"), {
        startHour: 9,
        endHour: 18,
        weekdaysOnly: true,
      }),
      false,
    );
    eq(
      policy.localDay(new Date("2026-10-20T21:00:00Z")).toISOString(),
      "2026-10-20T20:00:00.000Z",
    );
    eq(policy.email("name@example.test\r\nBcc: x@example.test"), "");
    assert.throws(() =>
      policy.steps([{ afterDays: 0, subject: "{{unknown}}", body: "text" }]),
    );
    count++;
    assert.throws(() =>
      policy.steps([{ afterDays: 0, subject: "Bad\r\nheader", body: "text" }]),
    );
    count++;
    let response = await cron.GET(
      new Request("https://thenewera.space/api/cron/sales-campaigns"),
    );
    eq(response.status, 403);
    process.env.SALES_CAMPAIGNS_ENABLED = "false";
    response = await cron.GET(
      new Request("https://thenewera.space/api/cron/sales-campaigns", {
        headers: {
          authorization: "Bearer " + process.env.SALES_CAMPAIGN_CRON_SECRET,
        },
      }),
    );
    eq(response.status, 200);
    eq((await response.json()).state, "DISABLED");
    process.env.SALES_CAMPAIGNS_ENABLED = "true";
    const stats = await api(undefined, staff);
    eq(stats.status, 200);
    ok(stats.data.items.length > 0);
    ok(!JSON.stringify(stats.data).includes(process.env.SALES_CAMPAIGN_SECRET));
    eq(
      (await api(undefined, customer, undefined, "?id=" + d.campaign.id))
        .status,
      403,
    );
    // Existing sales APIs still operate; campaign logic does not replace manual operations.
    const old = require("../app/api/admin/sales/route.ts");
    current = admin;
    response = await old.GET();
    eq(response.status, 200);
    ok((await response.json()).deals.some((x) => x.id === "old-deal"));
    // A complete three-step sequence uses real intervals and stable threading.
    await pauseAll();
    headers = [];
    const flow = await deal("complete-flow@example.test");
    d = await draft([flow]);
    await approve(d);
    before = smtpCalls.length;
    eq((await tick()).sent, 1);
    let flowRow = await db.salesCampaignRecipient.findUnique({
      where: { id: d.recipients[0].id },
    });
    ok(
      flowRow.nextAt.getTime() - flowRow.lastSentAt.getTime() === 3 * 86400000,
    );
    eq((await tick()).sent, 0);
    await db.salesCampaignRecipient.update({
      where: { id: flowRow.id },
      data: { nextAt: new Date(0) },
    });
    eq((await tick()).sent, 1);
    let flowDeliveries = await db.salesCampaignDelivery.findMany({
      where: { recipientId: flowRow.id },
      orderBy: { step: "asc" },
    });
    eq(smtpCalls.at(-1).inReplyTo, flowDeliveries[0].messageId);
    flowRow = await db.salesCampaignRecipient.findUnique({
      where: { id: flowRow.id },
    });
    eq(flowRow.nextAt.getTime() - flowRow.lastSentAt.getTime(), 4 * 86400000);
    await db.salesCampaignRecipient.update({
      where: { id: flowRow.id },
      data: { nextAt: new Date(0) },
    });
    eq((await tick()).sent, 1);
    eq(smtpCalls.length, before + 3);
    eq(
      (
        await db.salesCampaignRecipient.findUnique({
          where: { id: flowRow.id },
        })
      ).state,
      "COMPLETED",
    );
    eq((await tick()).sent, 0);
    eq(smtpCalls.length, before + 3);
    // Replies after the last send are still detected while campaign is paused.
    flowDeliveries = await db.salesCampaignDelivery.findMany({
      where: { recipientId: flowRow.id },
      orderBy: { step: "asc" },
    });
    await pauseAll();
    headers = [
      {
        from: [{ address: flow.email }],
        date: new Date().toISOString(),
        references: flowDeliveries[2].messageId,
      },
    ];
    await db.salesCampaignRecipient.updateMany({
      where: { state: { in: ["PENDING", "COMPLETED"] } },
      data: { lastReplyCheckedAt: new Date(Date.now() + 3600000) },
    });
    await db.salesCampaignRecipient.update({
      where: { id: flowRow.id },
      data: { lastReplyCheckedAt: null },
    });
    eq((await tick()).sent, 0);
    eq(
      (
        await db.salesCampaignRecipient.findUnique({
          where: { id: flowRow.id },
        })
      ).state,
      "REPLIED",
    );
    headers = [];
    const rejected = await deal("reject@example.test");
    d = await draft([rejected]);
    await approve(d);
    smtpMode = "reject";
    before = smtpCalls.length;
    await tick();
    eq(
      (
        await db.salesCampaignRecipient.findUnique({
          where: { id: d.recipients[0].id },
        })
      ).state,
      "FAILED",
    );
    await tick();
    eq(smtpCalls.length, before + 1);
    smtpMode = "ok";
    await pauseAll();
    const uncertainAgain = await deal("unknown@example.test");
    let blockedDraft = await draft([uncertainAgain]);
    eq(
      (
        await api(
          {
            action: "approve",
            id: blockedDraft.campaign.id,
            reviewKey: blockedDraft.reviewKey,
            confirm: true,
          },
          admin,
        )
      ).status,
      409,
    );
    const unknownRecipient = await db.salesCampaignRecipient.findFirst({
      where: { email: "unknown@example.test", state: "UNCERTAIN" },
    });
    eq(
      (
        await api(
          {
            action: "recipient",
            recipientId: unknownRecipient.id,
            outcome: "stop",
          },
          admin,
        )
      ).status,
      200,
    );
    blockedDraft = await draft([uncertainAgain]);
    await approve(blockedDraft);
    await api({ action: "cancel", id: blockedDraft.campaign.id }, admin);
    mailReady = false;
    eq((await api({ action: "create" }, admin)).status, 503);
    mailReady = true;
    // A resumed campaign requires a new explicit review and confirmation.
    const paused = await deal("resume@example.test");
    d = await draft([paused]);
    await approve(d);
    await api({ action: "pause", id: d.campaign.id }, admin);
    eq((await tick()).sent, 0);
    let freshReview = (
      await api(undefined, admin, undefined, "?id=" + d.campaign.id)
    ).data;
    eq(
      (
        await api(
          {
            action: "resume",
            id: d.campaign.id,
            reviewKey: freshReview.reviewKey,
          },
          admin,
        )
      ).status,
      400,
    );
    eq(
      (
        await api(
          {
            action: "resume",
            id: d.campaign.id,
            reviewKey: freshReview.reviewKey,
            confirm: true,
          },
          admin,
        )
      ).status,
      200,
    );
    await api({ action: "cancel", id: d.campaign.id }, admin);
    console.log(
      `PASS ${count} sales campaign checks: additive migration, approvals, SMTP uncertainty, concurrency, reply stop, suppression, limits, role isolation and legacy sales.`,
    );
  } finally {
    Module._load = orig;
    await db.$disconnect();
    await server.stop();
    await pg.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
