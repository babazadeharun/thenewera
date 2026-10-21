import { reject } from './offer-policy';
import { statusLabel, type OutreachStatus, outreachStatuses } from './prospecting-shared';
export function usernameInput(value: unknown) {
  if (typeof value !== 'string' || value.length > 200) reject('Instagram istifadəçi adını düzgün daxil edin.');
  let s = value.trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) {
    let u: URL;
    try { u = new URL(s); } catch { reject('Instagram profil linki düzgün deyil.'); }
    if (!['instagram.com','www.instagram.com'].includes(u!.hostname) || u!.username || u!.password || u!.port) reject('Yalnız instagram.com profil linkindən istifadə edin.');
    const parts = u!.pathname.split('/').filter(Boolean);
    if (parts.length !== 1) reject('Paylaşım və ya reel linki deyil, profil linkini daxil edin.');
    s = parts[0];
  } else s = s.replace(/^@/, '');
  s = s.toLowerCase();
  if (!/^[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?$/.test(s) || s.includes('..') || ['p','reel','reels','stories','direct','accounts','explore','oauth','about'].includes(s)) reject('Düzgün Instagram istifadəçi adı daxil edin (ən çox 30 simvol).');
  return s;
}
export const profileFor = (username: string) => username ? `https://www.instagram.com/${username}/` : null;
export function draftInput(value: unknown) {
  if (typeof value !== 'string' || value.length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) reject('Mesaj ən çox 4000 simvol olmalıdır.');
  return value.trim();
}
export function versionInput(v: unknown) {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) reject('Qeydi yeniləyib təkrar cəhd edin.', 409);
  return v;
}
export function statusInput(v: unknown): OutreachStatus {
  if (!outreachStatuses.some(([s]) => s === v)) reject('Əlaqə statusu düzgün deyil.');
  return v as OutreachStatus;
}
