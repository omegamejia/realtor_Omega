"use client";

import { Children, useId, useState } from "react";
import type { ReactNode } from "react";

/**
 * Collapses a long grid to the first couple of rows behind a "Show all" button.
 *
 * Why this exists: an agent working twenty neighborhoods gets twenty cards, and
 * a visitor scrolls past nineteen of them to reach anything else. The list is
 * genuinely useful, so it is not the content that is wrong, only how much of it
 * arrives at once.
 *
 * Every item stays in the DOM and is hidden with CSS rather than unmounted.
 * These cards ARE the interlinking between a hub page and its children, so
 * rendering only the first six would quietly cut the site's internal link graph
 * to save some scrolling. Hidden links still crawl; unmounted ones do not.
 */
export function ShowMore({
  children,
  visible = 6,
  label = "areas",
}: {
  children: ReactNode;
  /** How many stay visible when collapsed. Keep it a whole number of rows. */
  visible?: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const items = Children.toArray(children);
  const hiddenCount = Math.max(0, items.length - visible);

  if (hiddenCount === 0) return <>{children}</>;

  return (
    <>
      {items.map((child, i) => {
        const isHidden = !open && i >= visible;
        return (
          <div
            key={i}
            // `hidden` (not removal) keeps the link in the document for crawlers
            // and for anyone using find-in-page.
            hidden={isHidden}
            aria-hidden={isHidden || undefined}
            className={isHidden ? "hidden" : "contents"}
          >
            {child}
          </div>
        );
      })}

      <div className="col-span-full mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={id}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-md border border-[color:var(--border-strong)] px-6 py-3 text-sm font-semibold text-[color:var(--brand-ink)] transition-colors hover:border-[var(--brand)] hover:bg-[color:var(--surface-muted)]"
        >
          {open ? "Show fewer" : `Show all ${items.length} ${label}`}
          <span aria-hidden>{open ? "↑" : "↓"}</span>
        </button>
      </div>
    </>
  );
}
