"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * Scroll reveal. On mount an element tags itself `.reveal-ready`; once its top
 * edge has been reached it gets `.in-view`, and everything visual happens in
 * globals.css behind `prefers-reduced-motion`.
 *
 * THREE THINGS THIS HAS TO GET RIGHT. All three have a wrong version that
 * looks perfectly fine in a screenshot.
 *
 * 1. NO JS, NO HIDING. `.reveal-ready` is added by this effect and nothing
 *    else. A visitor with JS disabled — and every crawler reading the server
 *    HTML, which is how `npm run launch:check` sees this site — gets content
 *    that was never hidden in the first place. Putting the hidden state in the
 *    stylesheet unconditionally is how a site ships blank.
 *
 * 2. "HAS ITS TOP BEEN REACHED", NOT "IS IT INTERSECTING". This started as an
 *    IntersectionObserver and it was wrong in a way that only measuring found.
 *    An observer fires when it *samples* an element as intersecting; jump the
 *    scroll position and the sections you flew past are never sampled that
 *    way, so they stay invisible forever. On this homepage that meant clicking
 *    "Areas" in the section nav blanked everything above it — and End, and any
 *    deep link to an anchor, and a restored scroll position. Re-measuring the
 *    rectangle on every tick cannot have that bug: passed-by and about-to-
 *    arrive are the same question, asked fresh.
 *
 * 3. ONE LISTENER, NOT ONE PER SECTION. Every element on the page shares the
 *    registry below, so a long page costs a single rAF-throttled scroll
 *    handler rather than twenty.
 */

/* ── The shared registry ───────────────────────────────────────────────────
   Module scope: one Set, one listener, attached when the first element
   registers and removed when the last one reveals. */

const pending = new Set<HTMLElement>();
let listening = false;
let ticking = false;

/** Reveal a little before the top edge lands, so it is arriving, not arrived. */
const TRIGGER = 0.92;

function sweep() {
  ticking = false;
  const limit = window.innerHeight * TRIGGER;
  for (const el of pending) {
    if (el.getBoundingClientRect().top < limit) {
      el.classList.add("in-view");
      pending.delete(el);
    }
  }
  if (pending.size === 0) stop();
}

function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(sweep);
  }
}

function start() {
  if (listening) return;
  listening = true;
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  /* A tab that MOUNTS WHILE HIDDEN — restored session, opened in the
     background, an embedded preview pane — does not run rAF, so nothing here
     has measured anything by the time the reader looks at it. */
  document.addEventListener("visibilitychange", onScroll);
}

function stop() {
  if (!listening) return;
  listening = false;
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onScroll);
  document.removeEventListener("visibilitychange", onScroll);
}

export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.classList.add("reveal-ready");

    // Already at or above the trigger line at mount → show it now, with no
    // transition to flash on first paint.
    if (el.getBoundingClientRect().top < window.innerHeight * TRIGGER) {
      el.classList.add("in-view");
      return;
    }

    pending.add(el);
    start();
    return () => {
      pending.delete(el);
      if (pending.size === 0) stop();
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
