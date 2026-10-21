import type { ReactNode } from "react";
import Link from "next/link";

/**
 * EDITORIAL — the page template components.
 *
 * These exist to put Krista's own teaching on the page structurally, not just
 * in the words:
 *
 *   Attract -> Connect -> Convert   the arc every page follows
 *   Relevancy, Recency, Proximity   the three R's, shown rather than claimed
 *   Specialist, not commodity       one card inverts; the rest do not
 *
 * Everything is driven by --brand / --accent, so the same template re-skins
 * for any agent. Nothing here hardcodes a color, a font or a photograph.
 */

/** Full-bleed photographic moment: hero, mid-page break, closing. */
export function Bleed({
  image,
  size = "tall",
  children,
  id,
}: {
  /** Wide photo. Optional on purpose: a fresh seed ships no images at all, and
   *  plenty of agents start with none. Without one this renders a deep brand
   *  gradient, which reads as a deliberate design rather than a missing file. */
  image?: string;
  size?: "tall" | "mid";
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`ed-bleed ${size === "tall" ? "ed-bleed--tall" : "ed-bleed--mid"}${
        image ? "" : " ed-bleed--noimage"
      }`}
      style={image ? { backgroundImage: `url(${image})` } : undefined}
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        {children}
      </div>
    </section>
  );
}

/**
 * Breadcrumbs for a full-bleed hero.
 *
 * Replacing PageHero with Bleed on money pages quietly dropped the visible
 * trail. The schema BreadcrumbList survived, so nothing failed and no check
 * caught it, but a visitor arriving from search lost the one cue telling them
 * where in the site they had landed.
 */
export function BleedCrumbs({
  items,
}: {
  items: { name: string; href: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 p-0 text-sm text-white/70">
        {items.map((c, i) => (
          <li key={c.href} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="text-white/40">/</span>}
            {i === items.length - 1 ? (
              <span aria-current="page" className="text-white/90">{c.name}</span>
            ) : (
              <Link href={c.href} className="hover:text-white hover:underline">
                {c.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function EdEyebrow({ children }: { children: ReactNode }) {
  return <p className="ed-eyebrow mb-4">{children}</p>;
}

/** Sticky section nav. Anchors double as named subsections for search. */
export function SectionNav({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  return (
    <nav className="ed-toc" aria-label="On this page">
      <div className="ed-toc-inner mx-auto max-w-6xl px-5 sm:px-8">
        {items.map((i) => (
          <a key={i.href} href={i.href}>
            {i.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

/**
 * The named, numbered process. Her "eight chapters, one strategy" shape —
 * it turns an abstract service into something with a visible beginning and end.
 */
export function Chapters({
  steps,
  track = "selling",
}: {
  steps: { title: string; body: string }[];
  /** Which process page these steps belong to. Each step deep links into it. */
  track?: ProcessTrack;
}) {
  const { steps: canonical, path } = PROCESS_TRACKS[track];
  return (
    <ol className="mt-10 list-none p-0">
      {steps.map((s, i) => {
        // Match by position: the summary on a page lists the same steps in the
        // same order as the page that explains them.
        const anchor = canonical[i]?.id;
        const href = anchor ? `${path}#${anchor}` : path;
        return (
          <li key={s.title} className="ed-chapter group">
            <span className="ed-chapter-num" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="mb-2 text-xl font-semibold sm:text-2xl">
                <Link
                  href={href}
                  className="transition-colors hover:text-[color:var(--brand-ink)] hover:underline"
                >
                  {s.title}
                </Link>
              </h3>
              <p className="max-w-2xl text-[color:var(--fg-muted)]">{s.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** One claim, set large. The line a reader repeats and an AI assistant quotes. */
export function FieldNote({
  label = "Field note",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <aside className="ed-note mt-12">
      <p className="ed-eyebrow" style={{ marginBottom: ".75rem" }}>
        {label}
      </p>
      <p>{children}</p>
    </aside>
  );
}

/**
 * Bordered grid where exactly one cell inverts. The inverted cell is the
 * agent's own specialty, so "specialist, not commodity" is something the page
 * demonstrates at a glance instead of asserting in a sentence.
 */
export function HighlightGrid({
  items,
  featureIndex = -1,
}: {
  items: { kicker?: string; title: string; body: string; href?: string }[];
  featureIndex?: number;
}) {
  return (
    <div className="ed-grid mt-10">
      {items.map((it, i) => {
        const inner = (
          <>
            {it.kicker ? (
              <p className="ed-eyebrow mb-3">
                {String(i + 1).padStart(2, "0")} / {it.kicker}
              </p>
            ) : null}
            <h3 className="mb-2 text-xl font-semibold sm:text-2xl">{it.title}</h3>
            {/* Colour comes from CSS so it can follow :hover. An inline
                conditional here would pin the resting state and the hover
                would have nothing to change. */}
            <p>{it.body}</p>
          </>
        );
        const cls = `ed-cell${i === featureIndex ? " ed-cell--feature" : ""}`;
        return it.href ? (
          <Link key={it.title} href={it.href} className={`${cls} block`}>
            {inner}
          </Link>
        ) : (
          <div key={it.title} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The three R's, stated on the page. Relevancy, Recency and Proximity are why
 * a niche-plus-neighborhood page outperforms a generic one, and saying so
 * turns the site's structure into an argument for hiring this agent.
 */
export function ThreeRs({
  relevancy,
  recency,
  proximity,
}: {
  relevancy: string;
  recency: string;
  proximity: string;
}) {
  const rows = [
    { k: "Relevancy", v: relevancy },
    { k: "Recency", v: recency },
    { k: "Proximity", v: proximity },
  ];
  return (
    <dl className="mt-10 grid gap-px border-t border-[color:var(--hairline)]">
      {rows.map((r) => (
        <div
          key={r.k}
          className="grid gap-2 border-b border-[color:var(--hairline)] py-5 sm:grid-cols-[10rem_1fr] sm:gap-8"
        >
          <dt className="ed-eyebrow" style={{ marginBottom: 0 }}>
            {r.k}
          </dt>
          <dd className="m-0 text-[color:var(--fg-muted)]">{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The six steps, compressed. Every service page carries this instead of
 * repeating the method in full.
 *
 * Two problems it solves at once. The gate was reporting money pages at 52-53%
 * identical to each other, because the same process prose was being written out
 * on all 63 of them. And a reader who wants the detail had nowhere to go. Each
 * step deep links into /process#<id>, so the full version lives in exactly one
 * authoritative place and every page points into the right part of it.
 *
 * The ids match content/page-content/process.ts and lib/schema.ts HowToStep
 * urls. Change one, change all three.
 */
/**
 * E.P.I.C. — the seller framework. Equity, Presentation, Impact, Campaign.
 *
 * This is Krista's own listing-presentation framework, not a generic task list.
 * That distinction is the whole point: a chronological list of agent verbs
 * (prepare, present, position, market, negotiate, close) is what every agent
 * site converges on, because there are only so many verbs for selling a house.
 * EPIC is four ARGUMENTS about positioning, which is a different axis entirely.
 *
 * Tagline: Position. Impact. Conversion.
 */
export const PROCESS_STEPS = [
  { id: "equity", name: "Equity" },
  { id: "presentation", name: "Presentation" },
  { id: "impact", name: "Impact" },
  { id: "campaign", name: "Campaign" },
] as const;

/**
 * The buying track. A separate page and a separate set of steps, because
 * selling and buying are not the same job and a buyer shown a listing plan
 * learns nothing about what happens to them.
 *
 * HEAVIER STATE VARIANCE THAN SELLING. Who holds the deposit, whether an
 * attorney is required at closing, how the inspection window works and what it
 * is even called all change by state and sometimes by county. These names are a
 * skeleton to be confirmed with the agent for THEIR market, never published as
 * generic national truth. See .claude/rules/legal-compliance.md.
 */
/**
 * R.E.A.L. — the buyer framework. Ready, Educated, Aligned, Locked.
 *
 * Derived from what KMC actually teaches on the buyer side: a real consultation
 * before any showings, pre-approval before touring, an honest reality check on
 * what the budget buys, and representation made explicit up front. The
 * differentiator mirrors the seller one. Most agents show you houses. This gets
 * a buyer ready to win one.
 *
 * Deliberately NOT a mirror of EPIC. Sellers are choosing an agent, so they get
 * a positioning argument. Buyers are navigating something unfamiliar, so they
 * get a readiness sequence.
 */
export const BUYING_STEPS = [
  { id: "ready", name: "Ready" },
  { id: "educated", name: "Educated" },
  { id: "aligned", name: "Aligned" },
  { id: "locked", name: "Locked" },
] as const;

export const PROCESS_TRACKS = {
  selling: { path: "/process", steps: PROCESS_STEPS, label: "How we sell" },
  buying: { path: "/process/buying", steps: BUYING_STEPS, label: "How we buy" },
} as const;

export type ProcessTrack = keyof typeof PROCESS_TRACKS;

/**
 * NOTE ON SCOPE: /process describes SELLING a home. Rendering this on a buyer
 * page would promise a first-time buyer a six step listing plan, which is not
 * what they came for and not what we do for them. Buyer-side pages get nothing
 * here until a buying track exists at /process/buying.
 */
export function ProcessStrip({
  context,
  heading = "How we do it",
  track = "selling",
}: {
  /** e.g. "in Brentwood". Keeps the strip specific to the page it sits on. */
  context?: string;
  heading?: string;
  /** Which process this page belongs to. A buyer page must never show the
   *  selling track: it would promise a first-time buyer a six step listing
   *  plan, which is not what they came for and not what we do for them. */
  track?: ProcessTrack;
}) {
  const { steps, path } = PROCESS_TRACKS[track];
  return (
    <section className="surface-paper scroll-mt-24" id="how-we-do-it">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-14">
        <EdEyebrow>The method</EdEyebrow>
        <h2 className="display-h1 text-2xl sm:text-3xl">
          {heading}
          {context ? ` ${context}` : ""}
        </h2>

        {/* Names and numbers only, deliberately.
            The first version of this repeated a sentence per step on all 63
            service pages, and the gate went from warning at 52% similarity to
            FAILING 45 page pairs at 57%. Identical prose repeated site-wide is
            duplicate content no matter how good the prose is. The links carry
            the whole value: a reader who wants the detail is one tap from the
            real thing, and the real thing exists in exactly one place. */}
        <ol className="mt-7 grid list-none gap-px border-t border-[color:var(--hairline)] p-0 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.id} className="border-b border-[color:var(--hairline)]">
              <Link
                href={`${path}#${s.id}`}
                className="flex min-h-[56px] items-center gap-4 py-3 hover:text-[color:var(--brand-ink)]"
              >
                <span className="ed-chapter-num text-xl" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-semibold">{s.name}</span>
              </Link>
            </li>
          ))}
        </ol>

        <p className="mt-7">
          <Link
            href={path}
            className="font-semibold text-[color:var(--brand-ink)] hover:underline"
          >
            Read the whole process, step by step
          </Link>
        </p>
      </div>
    </section>
  );
}

/**
 * Which step of the process a given page is really about.
 *
 * A CTA on a valuation page should land on Position, not on the top of the
 * process page, because pricing is the doubt that reader actually has. Returns
 * undefined for buyer-side and unknown slugs, which sends the link to /process
 * unanchored rather than guessing wrong.
 */
export function processStepFor(
  nicheSlug?: string,
  track: ProcessTrack = "selling"
): string | undefined {
  if (!nicheSlug) return undefined;
  // Which pillar answers the doubt THIS reader actually arrived with. A
  // valuation page belongs on Equity because the question is what it is worth;
  // a selling page belongs on Impact because the question is who will see it.
  const selling: Record<string, string> = {
    "home-valuation": "equity",
    "selling-your-home": "impact",
    downsizing: "campaign",
    "divorce-home-sale": "campaign",
    "probate-and-trust": "campaign",
  };
  const buying: Record<string, string> = {
    "first-time-buyers": "ready",
    "buying-a-home": "aligned",
    relocation: "educated",
    "va-and-military": "ready",
    "move-up-buyers": "educated",
    "investment-property": "aligned",
  };
  return (track === "buying" ? buying : selling)[nicheSlug];
}

/**
 * The part of a money page that could not be true of the area next door.
 *
 * Every money page shares its method sections, correctly: an agent sells a home
 * in one neighborhood the same way they sell one in the next, and varying that
 * to manufacture difference would be a lie a local reader spots. What must
 * differ is the PLACE, and this is where it goes.
 *
 * The copy comes from the area's own confirmed description rather than being
 * generated per page, so 253 pages differentiate without a single invented
 * fact. Where `localFacts` exists it adds real specifics on top.
 *
 * Fair Housing: this describes the place, never who lives there. See
 * .claude/rules/legal-compliance.md.
 */
export function AreaContext({
  area,
  nicheLabel,
}: {
  area: {
    name: string;
    blurb?: string;
    body?: string[];
    localFacts?: {
      homes?: string;
      whoLivesHere?: string;
      schools?: string;
      gettingAround?: string;
      nearby?: string;
      tradeOff?: string;
    };
  };
  nicheLabel: string;
}) {
  const f = area.localFacts;
  const rows = [
    ["The homes", f?.homes],
    ["Why people choose it", f?.whoLivesHere],
    ["Schools people ask about", f?.schools],
    ["Getting around", f?.gettingAround],
    ["Nearby", f?.nearby],
    ["The trade-off", f?.tradeOff],
  ].filter(([, v]) => Boolean(v)) as [string, string][];

  const paras = (area.body ?? []).slice(0, 2);
  if (!paras.length && !rows.length && !area.blurb) return null;

  return (
    <section id="about-the-area" className="surface-paper scroll-mt-24">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <p className="ed-eyebrow mb-3">{area.name}</p>
        <h2 className="display-h1 mb-5 text-3xl sm:text-4xl">
          What {nicheLabel.toLowerCase()} looks like in {area.name}
        </h2>
        {area.blurb ? (
          <p className="text-lg text-[color:var(--fg-muted)]">{area.blurb}</p>
        ) : null}
        {paras.map((p, i) => (
          <p key={i} className="mt-4 text-[color:var(--fg-muted)]">
            {p}
          </p>
        ))}
        {rows.length > 0 && (
          <dl className="mt-8 border-t border-[color:var(--hairline)]">
            {rows.map(([k, v]) => (
              <div
                key={k}
                className="grid gap-1 border-b border-[color:var(--hairline)] py-4 sm:grid-cols-[13rem_1fr] sm:gap-6"
              >
                <dt className="ed-eyebrow" style={{ marginBottom: 0 }}>
                  {k}
                </dt>
                <dd className="m-0 text-[color:var(--fg-muted)]">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
