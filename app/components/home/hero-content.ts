// CMS remains available; an explicit approved artwork takes visual precedence.
type Hero = { desktopMedia?: { url: string } | null; mobileMedia?: { url: string } | null; videoMedia?: { url: string } | null; ctaUrl?: string | null };
export function heroPresentation(hero: Hero | undefined, legacyImage?: string | null, approvedArtwork?: string) {
  const desktop = approvedArtwork || hero?.desktopMedia?.url || legacyImage || '/homepage/creative-scene-reference.webp';
  const mobile = approvedArtwork || hero?.mobileMedia?.url || desktop;
  const video = approvedArtwork ? undefined : hero?.videoMedia?.url;
  const requested = hero?.ctaUrl?.trim() || '';
  let cta = '/start-project';
  // Reject protocol-relative paths, backslashes, control characters and unsafe schemes.
  if (!/[\\\u0000-\u001f\u007f]/.test(requested)) {
    if (/^\/(?!\/)/.test(requested)) cta = requested;
    else {
      try { const url = new URL(requested); if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) cta = requested; } catch { /* Use the existing project route. */ }
    }
  }
  return { desktop, mobile, video, cta, defaultArtwork: Boolean(approvedArtwork) || !hero?.desktopMedia?.url && !hero?.mobileMedia?.url && !video && !legacyImage };
}
