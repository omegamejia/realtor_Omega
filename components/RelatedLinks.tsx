import Link from "next/link";
import { site } from "@/site.config";

/**
 * Enforced interlinking block. Rendered on every content page and blog post so
 * the HARD RULES always hold:
 *   - a link back to the home page (explore the business),
 *   - a call-to-action linking to the contact page,
 *   - plus contextual internal links that funnel the reader toward action.
 *
 * The launch gate verifies every content page contains a home link and a
 * /contact link, so this can't silently go missing.
 */
export function RelatedLinks({
  links = [],
  heading = "Keep exploring",
}: {
  links?: { label: string; href: string }[];
  heading?: string;
}) {
  return (
    <section className="border-t border-[color:var(--border)] bg-[color:var(--surface-muted)]">
      <div className="container-page py-12">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-[color:var(--fg-subtle)]">
            {heading}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {/* HARD RULE: always link home */}
            <Link
              href="/"
              className="rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-3 py-1.5 text-sm text-[color:var(--fg-muted)] hover:border-[var(--brand)] hover:text-[color:var(--brand)]"
            >
              {site.brand.logoText} home
            </Link>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-3 py-1.5 text-sm text-[color:var(--fg-muted)] hover:border-[var(--brand)] hover:text-[color:var(--brand)]"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* CTA to the contact page — the single closing CTA. (The business map
              already appears on every page via the footer, so it isn't repeated
              here.) */}
          <div className="mt-6 rounded-2xl bg-[var(--brand)] px-8 py-8 text-center">
            <p className="text-lg font-bold text-white">
              Ready to make your move with {site.brand.logoText}?
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-[color:var(--brand)] hover:bg-neutral-100"
              >
                Get in touch
              </Link>
              <a
                href={`tel:${site.agent.phone.replace(/[^0-9+]/g, "")}`}
                className="inline-flex items-center rounded-md border border-white/60 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Call {site.agent.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
