export const importFields = [
  ["title", "Şirkət / satış adı"],
  ["contactName", "Əlaqə şəxsi / ad soyad"],
  ["email", "E-poçt"],
  ["phone", "Telefon"],
  ["instagram", "Instagram"],
  ["industry", "Fəaliyyət sahəsi"],
  ["source", "Mənbə"],
  ["notes", "Qeyd"],
  ["address", "Klinika / ünvan"],
  ["evidence", "Mənbə / ərazi qeydi"],
  ["profileUrl", "Profil linki"],
] as const;

export function emailKey(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}
export function phoneKey(value: unknown) {
  const raw = String(value || "").trim();
  const international = /^(\+|00)/.test(raw);
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!international && /^0\d{9}$/.test(digits))
    digits = "994" + digits.slice(1);
  if (!international && /^\d{9}$/.test(digits)) digits = "994" + digits;
  return digits;
}

export const importAliases: Record<string, string[]> = {
  title: [
    "şirkət",
    "şirkətin adı",
    "şirkət adı",
    "satış adı",
    "company",
    "title",
    "company name",
    "ad / klinika",
  ],
  contactName: [
    "ad soyad",
    "ad",
    "əlaqə şəxsi",
    "həkim",
    "name",
    "full name",
    "contact",
    "contactname",
  ],
  email: ["email", "e-poçt", "e poçt", "mail", "e-mail"],
  phone: [
    "telefon",
    "telefon nömrəsi",
    "phone",
    "mobile",
    "tel",
    "əlaqə nömrəsi",
    "telefon / whatsapp",
  ],
  instagram: ["instagram", "ig", "instagram hesabı", "instagram adı"],
  industry: [
    "fəaliyyət sahəsi",
    "sahə",
    "industry",
    "ixtisas",
    "ixtisas / xidmət",
  ],
  source: ["mənbə", "source"],
  notes: ["qeyd", "qeydlər", "notes", "note"],
  address: ["klinika / ünvan", "ünvan", "address", "clinic / address"],
  evidence: ["bakı üzrə sübut", "ərazi qeydi"],
  profileUrl: ["profil linki", "profile url", "profile link"],
};
export const headerKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\u0307/g, "")
    .replace(/\s+/g, " ");
export function headerScore(row: string[]) {
  return Object.values(importAliases).filter((aliases) =>
    row.some((value) => aliases.includes(headerKey(value))),
  ).length;
}
