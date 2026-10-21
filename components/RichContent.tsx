import Link from "next/link";
import { site } from "@/site.config";
import type { PageContent, PageCTA } from "@/content/pages";
import { Bleed, FieldNote } from "@/components/editorial";

/** Stable anchor from a heading, so in-page nav and the section agree. */
export function sectionId(heading: string) {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/**
 * Renders long-form page content: sectioned prose, CTA bands woven in, and an
 * FAQ block. Used by area hubs and money pages when rich content exists.
 */
export function RichContent({
  content,
  breakImage,
  fieldNote,
  processStep,
}: {
  content: PageContent;
  /** Full-bleed photographic break, dropped in mid-page to let a long read
   *  breathe. Omitted when the agent has no usable wide photo. */
  breakImage?: string;
  /** One line, set large. The claim a reader repeats and an assistant quotes. */
  fieldNote?: string;
  /** Anchor on /process this page is really about, passed to the CTA band. */
  processStep?: string;
}) {
  const sections = content.sections;
  // Weave a CTA band in after the first section, and again at the end.
  const primaryCta = content.ctas[0];
  const secondaryCta = content.ctas.find(
    (c) => c !== primaryCta && !/^call/i.test(c.text)
  );

  return (
    <div>
      {sections.map((s, i) => {
        // Alternate white and paper so a long page reads as chapters rather
        // than one unbroken column of text.
        const paper = i % 2 === 1;
        return (
          <div key={i}>
            <section
              id={s.id ?? sectionId(s.heading)}
              className={`${paper ? "surface-paper" : ""} scroll-mt-24`}
            >
              <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
                <h2 className="display-h1 mb-5 text-3xl sm:text-4xl">
                  {s.heading}
                </h2>
                <div className="rich" dangerouslySetInnerHTML={{ __html: s.html }} />
                {i === 1 && fieldNote ? <FieldNote>{fieldNote}</FieldNote> : null}
              </div>
            </section>
            {i === 0 && (
              <CtaBand
                primary={primaryCta}
                secondary={secondaryCta}
                processStep={processStep}
              />
            )}
            {i === 1 && breakImage ? (
              <Bleed image={breakImage} size="mid">
                <p className="display-h1 max-w-3xl text-2xl sm:text-4xl">
                  {content.h1}
                </p>
              </Bleed>
            ) : null}
          </div>
        );
      })}

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
  processStep,
}: {
  primary?: PageCTA;
  secondary?: PageCTA;
  /** Anchor on /process most relevant to this page. Adds a third, lower
   *  commitment route out of the band: someone not ready to call is often
   *  ready to read how it works, and that reader is worth keeping. */
  processStep?: string;
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
          className="inline-flex items-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-[color:var(--brand-ink-light)] hover:bg-neutral-100"
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
      <div className="mt-5">
        <Link
          href={processStep ? `/process#${processStep}` : "/process"}
          className="inline-flex min-h-[44px] items-center text-sm font-semibold text-white/85 underline underline-offset-4 hover:text-white"
        >
          Or read how we do it, step by step
        </Link>
      </div>
    </div>
  );
}
