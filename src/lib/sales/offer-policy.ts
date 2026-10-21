import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { email, reject } from "./campaign-policy";
export { reject, CampaignError } from "./campaign-policy";
export type OfferService = {
  title: string;
  description: string;
  deliverables: string;
  duration: string;
  exclusions: string;
  quantity: number;
  unitMinor: number;
  billing: "ONCE" | "MONTHLY";
};
export const actions = ["ACCEPT", "CHANGE", "DECLINE", "MEETING"] as const;
export type OfferAction = (typeof actions)[number];
export const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export function key() {
  const s = process.env.SALES_OFFER_SECRET || "";
  if (s.length < 32) reject("Təklifin təhlükəsizlik açarı qurulmayıb.", 503);
  return s;
}
export function offerOrigin() {
  try {
    const u = new URL(
      process.env.SALES_OFFER_APP_URL || process.env.CRM_APP_URL || "",
    );
    if (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      u.pathname === "/" &&
      !u.search &&
      !u.hash
    )
      return u.origin;
  } catch {}
  reject("Təklif üçün HTTPS sayt ünvanı qurulmayıb.", 503);
}
export function tokenFor(id: string) {
  return createHmac("sha256", key())
    .update("offer-link:" + id)
    .digest("hex");
}
export function linkFor(id: string) {
  return `${offerOrigin()}/offer/${id}#${tokenFor(id)}`;
}
export function otpHash(id: string, code: string) {
  return createHmac("sha256", key())
    .update("offer-otp:" + id + ":" + code)
    .digest("hex");
}
export function equal(a: string, b: string) {
  return (
    /^[a-f0-9]{64}$/.test(a) &&
    /^[a-f0-9]{64}$/.test(b) &&
    timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"))
  );
}
function text(v: unknown, max: number, required = false) {
  if (typeof v !== "string" || v.length > max)
    reject("Mətn sahələrini düzgün doldurun.");
  const s = v.trim();
  if (required && !s) reject("Tələb olunan sahələri doldurun.");
  return s;
}
export function minor(value: unknown) {
  const s = String(value ?? "").trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s))
    reject("Qiymət müsbət olmalı və ən çox iki onluq rəqəmi olmalıdır.");
  const [whole, fraction = ""] = s.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
export function validateOffer(b: any) {
  const emailInput = text(b.recipientEmail ?? "", 254);
  const recipientEmail = emailInput ? email(emailInput) : "";
  if (emailInput && !recipientEmail) reject("Düzgün müştəri e-poçtu daxil edin.");
  if (!["AZN", "USD", "EUR"].includes(b.currency)) reject("Valyutanı seçin.");
  if (
    !Array.isArray(b.services) ||
    b.services.length < 1 ||
    b.services.length > 30
  )
    reject("1–30 xidmət əlavə edin.");
  const services: OfferService[] = b.services.map((s: any) => {
    if (!s || typeof s !== "object" || Array.isArray(s))
      reject("Xidmət məlumatlarını düzgün doldurun.");
    const quantity = Number(s.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000)
      reject("Xidmət sayı 1–10000 arasında olmalıdır.");
    if (!["ONCE", "MONTHLY"].includes(s.billing))
      reject("Ödəniş dövrünü seçin.");
    return {
      title: text(s.title, 160, true),
      description: text(s.description, 6000, true),
      deliverables: text(s.deliverables, 6000, true),
      duration: text(s.duration, 500, true),
      exclusions: text(s.exclusions, 3000),
      quantity,
      unitMinor: minor(s.unitPrice),
      billing: s.billing,
    };
  });
  // A single total must never combine a monthly fee and a one-time fee.
  if (new Set(services.map((s) => s.billing)).size !== 1)
    reject("Aylıq və birdəfəlik xidmətləri ayrı təkliflərdə hazırlayın.");
  const subtotal = services.reduce(
      (sum, s) => sum + s.quantity * s.unitMinor,
      0,
    ),
    discountMinor = minor(b.discount || "0");
  if (
    !Number.isSafeInteger(subtotal) ||
    subtotal > 2000000000 ||
    discountMinor > subtotal
  )
    reject("Yekun məbləğ və endirimi yoxlayın.");
  const expiresAt = new Date(b.expiresAt);
  if (
    !Number.isFinite(expiresAt.getTime()) ||
    expiresAt.getTime() <= Date.now() ||
    expiresAt.getTime() > Date.now() + 366 * 86400000
  )
    reject("Etibarlılıq tarixini növbəti 366 gün daxilində seçin.");
  return {
    recipientEmail,
    recipientName: text(b.recipientName, 160, true),
    company: text(b.company, 200),
    title: text(b.title, 200, true),
    introduction: text(b.introduction, 6000),
    services,
    currency: b.currency as string,
    discountMinor,
    totalMinor: subtotal - discountMinor,
    terms: text(b.terms, 6000, true),
    expiresAt,
  };
}
export function responseInput(b: any) {
  if (!actions.includes(b.response)) reject("Cavab seçimi düzgün deyil.");
  const message = text(b.message ?? "", 3000);
  if (["CHANGE", "MEETING"].includes(b.response) && !message)
    reject("Dəyişiklik və ya görüş üçün qeydinizi yazın.");
  return { action: b.response as OfferAction, message };
}
export const maskEmail = (s: string) => {
  const [a, b] = s.split("@");
  return a.slice(0, 2) + "•••@" + b;
};
