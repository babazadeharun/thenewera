export type Slide = { top: number; bottom: number; free: boolean };
export function slideTarget(slides: Slide[], y: number, viewport: number, offset: number, direction: 1 | -1, maxScroll: number): number | null {
  if (!slides.length) return null;
  // At document end the footer is a separate stop, so Up returns to analytics.
  let index = y >= maxScroll - 2 ? slides.length - 1 : 0;
  if (y < maxScroll - 2) for (let i = 0; i < slides.length; i++) if (slides[i].top <= y + offset + 2) index = i;
  const current = slides[index];
  const long = current.free || current.bottom - current.top > viewport - offset + 2;
  if (long && ((direction > 0 && y + viewport < current.bottom - 2) || (direction < 0 && y + offset > current.top + 2))) return null;
  const destination = slides[index + direction];
  if (!destination) return null;
  const target = direction < 0 && (destination.free || destination.bottom - destination.top > viewport - offset + 2)
    ? destination.bottom - viewport : destination.top - offset;
  const clamped = Math.max(0, Math.min(maxScroll, target));
  return Math.abs(clamped - y) < 2 ? null : clamped;
}

export function wheelPixels(delta: number, mode: number, viewport: number) {
  return delta * (mode === 1 ? 16 : mode === 2 ? viewport : 1);
}
