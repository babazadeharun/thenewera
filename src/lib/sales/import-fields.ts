export const importFields = [
  ["title", "Şirkət / satış adı"],
  ["contactName", "Əlaqə şəxsi / ad soyad"],
  ["email", "E-poçt"],
  ["phone", "Telefon"],
  ["instagram", "Instagram"],
  ["industry", "Fəaliyyət sahəsi"],
  ["source", "Mənbə"],
  ["notes", "Qeyd"],
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
