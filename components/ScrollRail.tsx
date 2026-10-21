"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * A horizontal rail of cards that advances sideways as the page scrolls past.
 *
 * Not a slider. Nothing auto-advances on a timer, nothing hides behind a
 * "next" button, and the reader is never waiting on it — the rail simply
 * travels from its first card toward its last in proportion to how far the
 * section has crossed the viewport, and stops the moment you stop scrolling.
 *
 * IT MOVES scrollLeft, NOT A TRANSFORM, and that is the whole design.
 *
 * The first version translated the track. It looked identical and was wrong
 * twice over. A transform does not change how far an element can be scrolled,
 * so a track shifted left by 240px put its first cards somewhere the reader
 * could never scroll back to — and the padding added to compensate opened a
 * gap of empty space on the left before the row even started, which is the
 * first thing anyone noticed about it.
 *
 * Driving the scroll position instead fixes both at once: the row starts flush
 * against the gutter with no dead space, every card stays reachable because it
 * is real scroll, and the rail is a normal scroller for touch, trackpad and
 * keyboard the entire time.
 *
 * TOUCH IT AND IT IS YOURS. The moment the reader drags, wheels, or tabs into
 * the rail, the scroll-driven motion stops for good and does not fight them
 * for the scroll position. Motion that wrestles a reader is worse than no
 * motion, and this is the failure mode every scroll-linked carousel has.
 */
export function ScrollRail({
  children,
  drift = 300,
  label,
}: {
  children: ReactNode;
  /** How far the rail advances, in PIXELS, across the section's whole pass.
   *  Roughly one card. Deliberately not a fraction of the scrollable width:
   *  that made the distance grow with the number of cards, so twenty-eight
   *  areas tore through seven of them while four would have barely moved. The
   *  drift should feel the same no matter how many cards there are. Halved
   *  below 768px, where a card is most of the screen. */
  drift?: number;
  /** Accessible name, since a scrollable region needs one. */
  label: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let released = false;
    let ticking = false;

    function update() {
      ticking = false;
      if (released || !rail) return;

      const rect = rail.getBoundingClientRect();
      const vh = window.innerHeight;
      // Raw pass: 0 as the rail enters the bottom of the viewport, 1 as it
      // leaves the top.
      const raw = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));

      /* IT MUST ARRIVE FLUSH. Driving straight off `raw` meant the rail was
         already ~150px in by the time it reached reading position, so the
         reader's first sight of it was a card sliced in half against the left
         edge — the dead space traded for a worse problem. HOLD keeps it at
         exactly 0 through the arrival, and the advance happens afterwards, as
         the section travels on up the screen. */
      const HOLD = 0.45;
      const progress = Math.max(0, (raw - HOLD) / (1 - HOLD));

      const max = rail.scrollWidth - rail.clientWidth;
      if (max <= 0) return;
      const budget = Math.min(max, window.innerWidth < 768 ? drift / 2 : drift);
      rail.scrollLeft = budget * progress;
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    /** Hand the rail over permanently the first time the reader touches it. */
    function release() {
      released = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", onScroll);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    // rAF is suspended while the tab is hidden, so the position would be stale
    // at whatever it was when the reader looked away. Recompute on return.
    document.addEventListener("visibilitychange", onScroll);

    for (const ev of ["pointerdown", "wheel", "touchstart", "keydown"] as const) {
      rail.addEventListener(ev, release, { passive: true, once: true });
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", onScroll);
      for (const ev of ["pointerdown", "wheel", "touchstart", "keydown"] as const) {
        rail.removeEventListener(ev, release);
      }
    };
  }, [drift]);

  return (
    <div
      ref={railRef}
      className="scroll-rail"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <div className="scroll-rail__track">{children}</div>
    </div>
  );
}
