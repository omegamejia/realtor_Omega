import Link from "next/link";
import { site } from "@/site.config";
import type { PageContent, PageCTA } from "@/content/pages";

/**
 * Renders long-form page content: sectioned prose, CTA bands woven in, and an
 * FAQ block. Used by area hubs and money pages when rich content exists.
 */
export function RichContent({ content }: { content: PageContent }) {
  const sections = content.sections;
  // Weave a CTA band in after the first section, and again at the end.
  const primaryCta = content.ctas[0];
  const secondaryCta = content.ctas.find(
    (c) => c !== primaryCta && !/^call/i.test(c.text)
  );

  return (
    <div>
      {sections.map((s, i) => (
        <div key={i}>
          <section className="mx-auto max-w-3xl py-8">
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-[color:var(--fg)]">
              {s.heading}
            </h2>
            <div
              className="rich"
              dangerouslySetInnerHTML={{ __html: s.html }}
            />
          </section>
          {i === 0 && <CtaBand primary={primaryCta} secondary={secondaryCta} />}
        </div>
      ))}

      {content.faqs.length > 0 && (
        <section className="mx-auto max-w-3xl py-8">
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-[color:var(--fg)]">
            Frequently Asked Questions
          </h2>
          <div className="divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
            {content.faqs.map((f, i) => (
              <div key={i} className="py-5">
                <h3 className="font-semibold text-[color:var(--fg)]">{f.q}</h3>
                <p className="mt-2 text-[color:var(--fg-muted)]">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ctaHref(cta: PageCTA | undefined): string {
  if (!cta) return "/contact";
  return /^call/i.test(cta.text)
    ? `tel:${site.agent.phone.replace(/[^0-9+]/g, "")}`
    : "/contact";
}

function CtaBand({
  primary,
  secondary,
}: {
  primary?: PageCTA;
  secondary?: PageCTA;
}) {
  if (!primary) return null;
  return (
    <div className="mx-auto my-8 max-w-3xl rounded-2xl bg-[var(--brand)] px-8 py-10 text-center">
      <p className="text-xl font-bold text-white">
        {primary.text}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href={ctaHref(primary)}
          className="inline-flex items-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-[color:var(--brand)] hover:bg-neutral-100"
        >
          {primary.text}
        </Link>
        {secondary && (
          <Link
            href={ctaHref(secondary)}
            className="inline-flex items-center rounded-md border border-white/60 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            {secondary.text}
          </Link>
        )}
        <a
          href={`tel:${site.agent.phone.replace(/[^0-9+]/g, "")}`}
          className="inline-flex items-center rounded-md border border-white/60 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          Call {site.agent.phone}
        </a>
      </div>
    </div>
  );
}
