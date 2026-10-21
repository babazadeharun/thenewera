// Shared client-side display validation. The server still independently validates every save.
function cents(value: unknown): number | null {
  const s = String(value ?? '').trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, fraction = ''] = s.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export function offerEditorTotals(services: { quantity: unknown; unitPrice: unknown }[], discount: unknown) {
  let subtotalMinor = 0;
  for (const service of services) {
    const quantity = Number(service.quantity), unit = cents(service.unitPrice);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000 || unit === null)
      return { subtotalMinor: null, discountMinor: null, totalMinor: null, error: 'Xidmət sayı 1–10000 arasında, qiymət isə sıfır və ya müsbət məbləğ olmalıdır (ən çox iki onluq rəqəmi).' };
    subtotalMinor += quantity * unit;
  }
  const discountMinor = cents(discount);
  if (!Number.isSafeInteger(subtotalMinor) || subtotalMinor > 2000000000 || discountMinor === null)
    return { subtotalMinor: null, discountMinor: null, totalMinor: null, error: 'Qiymətləri və endirim məbləğini yoxlayın.' };
  if (discountMinor > subtotalMinor)
    return { subtotalMinor, discountMinor, totalMinor: null, error: 'Endirim xidmətlərin cəmindən çox ola bilməz. Pulsuz təklif üçün qiyməti və endirimi 0 yazın və ya tam məbləğ qədər endirim tətbiq edin.' };
  return { subtotalMinor, discountMinor, totalMinor: subtotalMinor - discountMinor, error: '' };
}
