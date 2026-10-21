export const outreachStatuses = [
  ['NEW', 'Əlaqə qurulmayıb'], ['DRAFT', 'Mesaj hazırdır'],
  ['FIRST_SENT', 'İlk mesaj göndərildi'], ['WAITING', 'Cavab gözlənilir'],
  ['INTERESTED', 'Maraqlıdır'], ['OFFER_SHARED', 'Təklif linki paylaşıldı'],
  ['DECLINED', 'Maraqlı deyil'], ['NO_REPLY', 'Cavab yoxdur'],
  ['DO_NOT_CONTACT', 'Əlaqə saxlamayın'],
] as const;
export type OutreachStatus = typeof outreachStatuses[number][0];
export const statusLabel = (s: string) => outreachStatuses.find(([v]) => v === s)?.[1] || s;

export const outreachTemplates = [
  { id: 'intro', label: 'İlk tanışlıq', text: 'Salam, {ad}. NEW ERA-dan yazıram. {sirket} üçün daha çox uyğun müraciəti real müştəriyə çevirmək istiqamətində əməkdaşlıq təklif etmək istəyirik. Sizin üçün qısa yanaşmamızı paylaşmağımız maraqlı olardı?' },
  { id: 'medical', label: 'Həkim / klinika', text: 'Salam, {ad}. NEW ERA olaraq həkim və klinikalara sosial mediadan gələn müraciətləri daha sistemli izləmək və görüşə çevirməkdə kömək edirik. Sizin fəaliyyətinizə uyğun qısa əməkdaşlıq təklifimizi paylaşa bilərik?' },
  { id: 'offer', label: 'Razılıqdan sonra təklif', text: 'Salam, {ad}. Danışdığımız əməkdaşlıq üzrə xidmətlərin əhatəsini və şərtləri sizin üçün hazırladıq. Aşağıdakı linkdən baxıb fikrinizi bildirə bilərsiniz.' },
] as const;
export function fillOutreachTemplate(text: string, name: string, company: string) {
  return text.replaceAll('{ad}', name.trim() || 'hörmətli nümayəndə').replaceAll('{sirket}', company.trim() || 'biznesiniz');
}
