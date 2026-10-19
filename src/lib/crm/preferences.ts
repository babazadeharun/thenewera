import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { fail, required, str, num } from "./policy";
import { permit, write, entry, where, log, type Context, type DB } from "./db";
export type Prefs = {
  fields?: {
    key: string;
    label: string;
    kind: string;
    type: string;
    required: boolean;
    options: string[];
  }[];
  pipelines?: { id: string; name: string; stages: string[] }[];
  gates?: { pipelineId: string; stage: string; fields: string[] }[];
  approvalAbove?: number;
  approvalDiscount?: number;
  brand?: { title: string; footer: string };
  slaMinutes?: number;
  quickReplies?: { title: string; body: string }[];
  industryTemplate?: string;
};
export const prefs = (c: Context) => c.company.preferences as Prefs;
export function fields(c: Context, kind: string, value: unknown) {
  const definitions = prefs(c).fields?.filter((f) => f.kind === kind) || [];
  const input = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const out: Record<string, Prisma.InputJsonValue | null> = {};
  for (const f of definitions) {
    const v = input[f.key];
    if (f.required && (v === undefined || v === null || v === ""))
      fail(f.label + " sahəsini doldurun.");
    if (v === undefined || v === null || v === "") {
      out[f.key] = null;
      continue;
    }
    if (f.type === "number") out[f.key] = num(v);
    else if (f.type === "checkbox") out[f.key] = v === true || v === "true";
    else {
      const text = str(v, 2000);
      if (f.type === "select" && !f.options.includes(text))
        fail(f.label + " seçimi düzgün deyil.");
      if (f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(text))
        fail(f.label + " tarixi düzgün deyil.");
      out[f.key] = text;
    }
  }
  return out;
}
export function pipeline(c: Context, id: unknown) {
  const selected = str(id, 80) || "main";
  const configured = prefs(c).pipelines || [];
  if (selected === "main")
    return { id: "main", name: "Əsas satış", stages: c.company.stages };
  return (
    configured.find((p) => p.id === selected) ||
    fail("Satış prosesi tapılmadı.")
  );
}
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
}
export function fingerprint(e: {
  title: string;
  amount: unknown;
  currency: string;
  customerId: string | null;
  data: unknown;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        e.title,
        String(e.amount),
        e.currency,
        e.customerId,
        canonical(e.data),
      ]),
    )
    .digest("hex");
}
export async function approvalNeeded(
  db: DB,
  c: Context,
  e: {
    id?: string;
    title: string;
    amount: unknown;
    currency: string;
    customerId: string | null;
    data: unknown;
  },
) {
  const p = prefs(c),
    d = e.data as Record<string, unknown>;
  const needed =
    (p.approvalAbove !== undefined && Number(e.amount) > p.approvalAbove) ||
    (p.approvalDiscount !== undefined &&
      Number(d.discount || 0) > p.approvalDiscount);
  if (!needed) return false;
  return (
    !e.id ||
    !(await db.crmApproval.findFirst({
      where: {
        companyId: c.company.id,
        entryId: e.id,
        fingerprint: fingerprint(e),
        status: "APPROVED",
      },
    }))
  );
}
export async function configure(
  db: DB,
  c: Context,
  b: Record<string, unknown>,
) {
  permit(c, "settings", "update");
  write(c);
  const p: Prefs = { ...prefs(c) };
  if (b.fields !== undefined) {
    if (!Array.isArray(b.fields) || b.fields.length > 40)
      fail("Maksimum 40 fərdi sahə.");
    const keys = new Set<string>();
    p.fields = b.fields.map((f) => {
      const x = f as Record<string, unknown>,
        key = required(x.key, 50);
      if (!/^[a-z][a-z0-9_]*$/.test(key) || keys.has(key))
        fail("Sahə açarı unikal olmalıdır.");
      keys.add(key);
      const kind = required(x.kind),
        type = required(x.type);
      if (
        !["customers", "sales", "tasks", "calendar", "quotes"].includes(kind) ||
        !["text", "number", "date", "select", "checkbox"].includes(type)
      )
        fail("Sahə tipi düzgün deyil.");
      return {
        key,
        label: required(x.label),
        kind,
        type,
        required: x.required === true,
        options: Array.isArray(x.options)
          ? x.options.map((o) => required(o, 100)).slice(0, 50)
          : [],
      };
    });
  }
  if (b.pipelines !== undefined) {
    if (!Array.isArray(b.pipelines) || b.pipelines.length > 10)
      fail("Maksimum 10 satış prosesi.");
    const ids = new Set(["main"]);
    p.pipelines = b.pipelines.map((v) => {
      const x = v as Record<string, unknown>,
        id = required(x.id, 80);
      if (!/^[a-z0-9_-]+$/.test(id) || ids.has(id))
        fail("Proses açarı unikal olmalıdır.");
      ids.add(id);
      if (!Array.isArray(x.stages) || !x.stages.length || x.stages.length > 20)
        fail("1–20 mərhələ seçin.");
      return {
        id,
        name: required(x.name),
        stages: Array.from(new Set(x.stages.map((s) => required(s, 80)))),
      };
    });
    const active = await db.crmEntry.findMany({
      where: { companyId: c.company.id, kind: "sales", deletedAt: null },
      select: { pipelineId: true, stage: true },
    });
    for (const e of active) {
      const stages =
        e.pipelineId === "main"
          ? c.company.stages
          : p.pipelines.find((x) => x.id === e.pipelineId)?.stages;
      if (!stages || (e.stage && !stages.includes(e.stage)))
        fail("İstifadə olunan prosesi/mərhələni əvvəlcə qeydlərdə dəyişin.");
    }
  }
  if (b.gates !== undefined) {
    if (!Array.isArray(b.gates) || b.gates.length > 50)
      fail("Mərhələ şərtləri düzgün deyil.");
    p.gates = b.gates.map((v) => {
      const x = v as Record<string, unknown>;
      const pipelineId = required(x.pipelineId),
        stage = required(x.stage);
      const stages =
        pipelineId === "main"
          ? c.company.stages
          : p.pipelines?.find((p) => p.id === pipelineId)?.stages;
      if (!stages?.includes(stage)) fail("Mərhələ mövcud deyil.");
      return {
        pipelineId,
        stage,
        fields: Array.isArray(x.fields)
          ? x.fields
              .map((f) => required(f, 50))
              .filter((f) =>
                [
                  "nextStep",
                  "customerId",
                  "dueAt",
                  ...(p.fields || [])
                    .filter((f) => f.kind === "sales")
                    .map((f) => f.key),
                ].includes(f),
              )
          : [],
      };
    });
  }
  for (const key of ["approvalAbove", "approvalDiscount"] as const)
    if (b[key] !== undefined) p[key] = b[key] === "" ? undefined : num(b[key]);
  if (b.slaMinutes !== undefined)
    p.slaMinutes = Math.max(1, Math.min(10080, Math.floor(num(b.slaMinutes))));
  if (b.brand && typeof b.brand === "object") {
    const x = b.brand as Record<string, unknown>;
    p.brand = { title: str(x.title, 200), footer: str(x.footer, 2000) };
  }
  if (b.quickReplies !== undefined) {
    if (!Array.isArray(b.quickReplies) || b.quickReplies.length > 50)
      fail("Maksimum 50 hazır cavab.");
    p.quickReplies = b.quickReplies.map((x) => ({
      title: required(x.title),
      body: required(x.body, 5000),
    }));
  }
  if (b.industryTemplate) {
    const t = required(b.industryTemplate);
    if (!["general", "clinic", "agency", "services"].includes(t))
      fail("Şablon düzgün deyil.");
    p.industryTemplate = t;
  }
  const clean = JSON.parse(JSON.stringify(p));
  await db.crmCompany.update({
    where: { id: c.company.id },
    data: { preferences: clean },
  });
  await log(
    db,
    c.company.id,
    c.user,
    "PREFERENCES_CHANGED",
    {},
    undefined,
    Boolean(c.support),
  );
  return { ok: true };
}
export async function approvals(
  db: DB,
  c: Context,
  b?: Record<string, unknown>,
) {
  if (!b) {
    permit(c, "quotes", "read");
    const visible = await db.crmEntry.findMany({
      where: await where(db, c, "quotes"),
      select: { id: true },
    });
    return db.crmApproval.findMany({
      where: {
        companyId: c.company.id,
        entryId: { in: visible.map((e) => e.id) },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
  write(c, "quotes");
  const e = await entry(db, c, required(b.entryId), "update");
  if (e.kind !== "quotes") fail("Yalnız təkliflər üçün.");
  const key = {
    companyId: c.company.id,
    entryId: e.id,
    fingerprint: fingerprint(e),
  };
  if (b.action === "request") {
    const r = await db.crmApproval.upsert({
      where: { companyId_entryId_fingerprint: key },
      create: { ...key, requesterId: c.user.id },
      update: {},
    });
    await log(
      db,
      c.company.id,
      c.user,
      "APPROVAL_REQUESTED",
      {},
      e.id,
      Boolean(c.support),
    );
    return r;
  }
  permit(c, "settings", "update");
  if (!["APPROVED", "REJECTED"].includes(String(b.status)))
    fail("Qərar seçin.");
  const r =
    (await db.crmApproval.findUnique({
      where: { companyId_entryId_fingerprint: key },
    })) || fail("Əvvəlcə təsdiq sorğusu yaradın.");
  if (r.status !== "PENDING") fail("Qərar artıq verilib.", 409);
  const updated = await db.crmApproval.update({
    where: { id: r.id },
    data: {
      status: String(b.status),
      approverId: c.user.id,
      reason: required(b.reason, 2000),
      decidedAt: new Date(),
    },
  });
  await log(
    db,
    c.company.id,
    c.user,
    "APPROVAL_" + String(b.status),
    { reason: String(b.reason) },
    e.id,
    Boolean(c.support),
  );
  return updated;
}
