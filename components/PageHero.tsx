import Link from "next/link";
import type { ReactNode } from "react";

export type Crumb = { name: string; path: string };

/**
 * PageHero — the SINGLE page-header treatment for the whole site.
 *
 * Every top-of-page header routes through this one component, so the header's
 * type, spacing, accent, and structure are controlled in ONE place. Change the
 * markup or the `.display-h1` / `.hl-accent` / `.eyebrow-tick` rules in
 * globals.css and every page updates — no per-page edits.
 *
 *   <PageHero eyebrow="For sellers" title="Selling in" titleAccent="[CITY]"
 *             subhead="..." />
 *
 * - `titleAccent` renders after `title` with the signature accent underline.
 * - `backLink` OR `breadcrumbs` render above the eyebrow (use one).
 */
export function PageHero({
  eyebrow,
  title,
  titleAccent,
  subhead,
  backLink,
  breadcrumbs,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  titleAccent?: string;
  subhead?: ReactNode;
  backLink?: { href: string; label: string };
  breadcrumbs?: Crumb[];
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-[color:var(--border)] bg-[color:var(--surface-muted)]">
      <div className="container-page py-14 sm:py-16">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[color:var(--fg-subtle)]">
              {breadcrumbs.map((c, i) => (
                <li key={c.path} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden>/</span>}
                  {i < breadcrumbs.length - 1 ? (
                    <Link
                      href={c.path}
                      className="hover:text-[color:var(--brand)]"
                    >
                      {c.name}
                    </Link>
                  ) : (
                    <span className="text-[color:var(--fg-muted)]">{c.name}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {backLink && !breadcrumbs && (
          <Link
            href={backLink.href}
            className="mb-4 inline-block text-sm font-medium text-[color:var(--fg-subtle)] transition-colors hover:text-[color:var(--brand)]"
          >
            ← {backLink.label}
          </Link>
        )}

        {eyebrow && (
          <p className="eyebrow-tick mb-3 text-sm font-semibold uppercase tracking-widest text-[color:var(--accent-text)]">
            {eyebrow}
          </p>
        )}

        <h1 className="display-h1 max-w-3xl">
          {title}
          {titleAccent ? (
            <> <span className="hl-accent">{titleAccent}</span></>
          ) : null}
        </h1>

        {subhead && (
          <p className="mt-4 max-w-2xl text-lg text-[color:var(--fg-muted)]">
            {subhead}
          </p>
        )}

        {children}
      </div>
    </section>
  );
}
