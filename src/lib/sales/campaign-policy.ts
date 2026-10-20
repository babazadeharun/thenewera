import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export class CampaignError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function reject(message: string, status = 400): never {
  throw new CampaignError(status, message);
}
export function email(value: unknown) {
  const s = String(value || "")
    .trim()
    .toLowerCase();
  return s.length <= 254 &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(
      s,
    ) &&
    !/[\r\n]/.test(s)
    ? s
    : "";
}
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export type Step = { afterDays: number; subject: string; body: string };
export const stopStatuses = [
  "RESPONDED",
  "INTERESTED",
  "MEETING",
  "ACCEPTED",
  "DECLINED",
];
export function template(text: string, fields: Record<string, string>) {
  return text.replace(
    /\{\{(name|company|service)\}\}/g,
    (_, key) => fields[key] || "",
  );
}
export function steps(value: unknown): Step[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3)
    reject("Əsas məktub və ən çox iki xatırlatma seçin.");
  return value.map((s, i) => {
    const afterDays = Number(s?.afterDays),
      subject = String(s?.subject || "").trim(),
      body = String(s?.body || "").trim();
    if (
      !subject ||
      subject.length > 200 ||
      /[\r\n]/.test(subject) ||
      !body ||
      body.length > 12000
    )
      reject("Mövzu və məktub mətnini düzgün doldurun.");
    if (
      !Number.isInteger(afterDays) ||
      (i === 0 ? afterDays !== 0 : afterDays < 1 || afterDays > 30)
    )
      reject("Xatırlatma intervalı 1–30 gün olmalıdır.");
    for (const match of (subject + " " + body).matchAll(/\{\{([^{}]+)\}\}/g))
      if (!["name", "company", "service"].includes(match[1]))
        reject(
          "Dəyişənlər yalnız {{name}}, {{company}}, {{service}} ola bilər.",
        );
    return { afterDays, subject, body };
  });
}
export function integer(v: unknown, min: number, max: number) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max)
    reject(`Dəyər ${min}–${max} arasında olmalıdır.`);
  return n;
}
export function campaignConfig() {
  const sender = email(
      process.env.MAIL_FROM_ADDRESS ||
        process.env.MAIL_SMTP_USER ||
        process.env.EVENT_EMAIL_USER,
    ),
    replyTo = email(process.env.MAIL_IMAP_USER),
    raw = process.env.SALES_CAMPAIGN_APP_URL || process.env.CRM_APP_URL || "";
  let origin = "";
  try {
    const u = new URL(raw);
    if (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      u.pathname === "/" &&
      !u.search &&
      !u.hash
    )
      origin = u.origin;
  } catch {}
  const secret = process.env.SALES_CAMPAIGN_SECRET || "",
    enabled = process.env.SALES_CAMPAIGNS_ENABLED === "true";
  const configHash = digest(
    JSON.stringify([
      sender,
      replyTo,
      origin,
      process.env.MAIL_SMTP_HOST || process.env.EVENT_EMAIL_HOST,
      process.env.MAIL_SMTP_USER || process.env.EVENT_EMAIL_USER,
      process.env.MAIL_IMAP_HOST,
      process.env.MAIL_IMAP_INBOX || "INBOX",
      digest(secret),
    ]),
  );
  return {
    sender,
    replyTo,
    origin,
    configHash,
    enabled,
    ready: Boolean(sender && replyTo && origin && secret.length >= 32),
    globalLimit: Math.min(
      200,
      Math.max(1, Number(process.env.SALES_CAMPAIGN_DAILY_LIMIT) || 50),
    ),
  };
}
// Baku UTC+4; sending hours and daily counters are evaluated on the server.
export function localDay(now: Date) {
  return new Date(
    Math.floor((now.getTime() + 14400000) / 86400000) * 86400000 - 14400000,
  );
}
export function inWindow(
  now: Date,
  c: { startHour: number; endHour: number; weekdaysOnly: boolean },
) {
  const d = new Date(now.getTime() + 14400000),
    h = d.getUTCHours();
  return (
    h >= c.startHour &&
    h < c.endHour &&
    (!c.weekdaysOnly || ![0, 6].includes(d.getUTCDay()))
  );
}
export function optOutSignature(id: string) {
  const key = process.env.SALES_CAMPAIGN_SECRET || "";
  if (key.length < 32) reject("Kampaniya açarı qurulmayıb.", 503);
  return createHmac("sha256", key)
    .update("sales-opt-out:" + id)
    .digest("hex");
}
export function validOptOut(id: string, sig: string) {
  if (
    !/^[a-z0-9-]{1,100}$/i.test(id) ||
    !/^[a-f0-9]{64}$/i.test(sig) ||
    (process.env.SALES_CAMPAIGN_SECRET || "").length < 32
  )
    return false;
  const a = Buffer.from(optOutSignature(id), "hex"),
    b = Buffer.from(sig, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
export function optOutURL(id: string) {
  return (
    campaignConfig().origin +
    "/sales/email-preferences?" +
    new URLSearchParams({ id, sig: optOutSignature(id) })
  );
}
export function render(step: Step, fields: Record<string, string>, id: string) {
  const subject = template(step.subject, fields),
    body = template(step.body, fields);
  return {
    subject,
    text: body + "\n\nBu məktubları almaq istəmirsinizsə: " + optOutURL(id),
  };
}
