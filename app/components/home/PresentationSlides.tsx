'use client';

import { useEffect } from 'react';
import { slideTarget, wheelPixels } from './slide-policy';

export default function PresentationSlides() {
  useEffect(() => {
    const root = document.documentElement;
    const mode = matchMedia('(min-width: 1021px) and (prefers-reduced-motion: no-preference)');
    let sum = 0, lastWheel = 0, lastDirection = 0, locked = false, gestureUsed = false, frame = 0;
    let animation: Animation | undefined;
    function cancelSlide() {
      cancelAnimationFrame(frame); animation?.cancel();
      if (locked) window.scrollTo({ top: scrollY, behavior: 'instant' });
      locked = false; gestureUsed = false; sum = 0;
    }
    const updateMode = () => {
      root.classList.toggle('neSlideshow', mode.matches);
      if (!mode.matches) cancelSlide();
    };
    updateMode(); mode.addEventListener('change', updateMode);

    function protectedTarget(target: EventTarget | null) {
      if (!mode.matches || document.querySelector('dialog[open], [aria-controls="home-menu"][aria-expanded="true"]')) return true;
      const selectors = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"]';
      if (document.activeElement?.closest(selectors)) return true;
      if (!(target instanceof Element)) return false;
      if (target.closest(selectors)) return true;
      // Nested scroll areas own their gestures; never scroll their parent page.
      for (let node: Element | null = target; node && node !== document.body; node = node.parentElement) {
        if (node.scrollHeight > node.clientHeight + 2 && ['auto','scroll'].includes(getComputedStyle(node).overflowY)) return true;
      }
      return false;
    }
    function destination(direction: 1 | -1) {
      const header = document.querySelector('header')?.getBoundingClientRect();
      const offset = header ? header.bottom + 22 : 110;
      const nodes = [...document.querySelectorAll<HTMLElement>('[data-presentation], main > footer')];
      const slides = nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return { top: rect.top + scrollY, bottom: rect.bottom + scrollY, free: node.hasAttribute('data-free-scroll') };
      });
      // Hero occupies a complete viewport, but is a slide rather than long copy.
      if (nodes[0]?.id === 'top' && nodes[0].offsetHeight <= innerHeight + 2) slides[0].free = false;
      return slideTarget(slides, scrollY, innerHeight, offset, direction, root.scrollHeight - innerHeight);
    }
    function move(top: number) {
      locked = true;
      window.scrollTo({ top, behavior: 'smooth' });
      let settled = 0, previous = scrollY;
      const begin = performance.now();
      const wait = () => {
        settled = Math.abs(scrollY - previous) < .5 ? settled + 1 : 0;
        previous = scrollY;
        if ((settled >= 8 && Math.abs(scrollY - top) < 2 && performance.now() - lastWheel > 180) || performance.now() - begin > 2500) {
          locked = false; sum = 0; return;
        }
        frame = requestAnimationFrame(wait);
      };
      frame = requestAnimationFrame(wait);
      const next = [...document.querySelectorAll<HTMLElement>('[data-presentation]')].find(node => Math.abs(node.getBoundingClientRect().top + scrollY - top) < 140);
      animation = next?.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 500, easing: 'ease-out' });
    }
    function wheel(event: WheelEvent) {
      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY) || protectedTarget(event.target)) return;
      const now = performance.now();
      const direction = event.deltaY > 0 ? 1 : -1;
      if (now - lastWheel > 180) { sum = 0; gestureUsed = false; }
      else if (direction !== lastDirection) sum = 0;
      lastWheel = now; lastDirection = direction;
      if (locked || gestureUsed) { gestureUsed = true; event.preventDefault(); return; }
      const top = destination(direction);
      if (top === null) { sum = 0; return; }
      event.preventDefault();
      sum += wheelPixels(event.deltaY, event.deltaMode, innerHeight);
      if (Math.abs(sum) >= 36) { gestureUsed = true; move(top); }
    }
    function key(event: KeyboardEvent) {
      if (['Home','End','Tab','Escape','Enter',' ','ArrowUp','ArrowDown'].includes(event.key)) { cancelSlide(); return; }
      const direction = event.key === 'PageDown' ? 1 : event.key === 'PageUp' ? -1 : 0;
      if (!direction || event.ctrlKey || event.metaKey || event.altKey || protectedTarget(event.target)) return;
      if (locked) { event.preventDefault(); return; }
      const top = destination(direction);
      if (top === null) return;
      event.preventDefault(); move(top);
    }
    window.addEventListener('pointerdown', cancelSlide, { passive: true });
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', key);
    return () => {
      root.classList.remove('neSlideshow');
      mode.removeEventListener('change', updateMode);
      window.removeEventListener('pointerdown', cancelSlide);
      window.removeEventListener('wheel', wheel); window.removeEventListener('keydown', key);
      cancelSlide();
    };
  }, []);
  return null;
}
