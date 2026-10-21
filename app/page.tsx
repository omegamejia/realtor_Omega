import Link from "next/link";
import { site, agentCredential } from "@/site.config";
import { posts } from "@/content/posts";
import { Section, Eyebrow, Heading, ButtonLink, Card } from "@/components/ui";
import { MapEmbed } from "@/components/MapEmbed";
import { JsonLd } from "@/components/JsonLd";
import { RichContent } from "@/components/RichContent";
import { ScaffoldBanner } from "@/components/ScaffoldBanner";
import { ShowMore } from "@/components/ShowMore";
import {
  Bleed,
  EdEyebrow,
  SectionNav,
  Chapters,
  FieldNote,
  HighlightGrid,
  ThreeRs,
} from "@/components/editorial";
import { pageSchema } from "@/lib/schema";
import { getPageContent } from "@/content/pages";
import { scaffoldFor } from "@/lib/scaffold";

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={pageSchema({
          path: "/",
          title: `${site.agent.name}: ${site.agent.tagline}`,
          description: site.agent.bio[0],
          crumbs: [{ name: "Home", path: "/" }],
        })}
      />
      {/* ATTRACT — a full-bleed opening that makes one claim and routes.
          The scrim carries white type over whatever photo the agent supplies,
          so this works with their listing photography rather than needing art
          direction we cannot give them. */}
      <Bleed image={site.business.heroImageUrl} size="tall">
        <EdEyebrow>
          {agentCredential()} · {site.location.city}, {site.location.state}
        </EdEyebrow>
        <h1 className="display-h1 display-hero max-w-4xl">
          {site.hero?.headlineLead ?? site.agent.tagline}
          {site.hero?.headlineAccent ? (
            <> <span className="hl-accent">{site.hero.headlineAccent}</span></>
          ) : null}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/85">
          {site.hero?.subhead ?? site.agent.bio[0]}
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/sellers" variant="on-dark-solid">Sell my home</ButtonLink>
          <ButtonLink href="/buyers" variant="on-dark">
            Find me a home
          </ButtonLink>
        </div>
      </Bleed>

      <SectionNav
        items={[
          { href: "#difference", label: "The difference" },
          { href: "#how", label: "How it works" },
          { href: "#specialties", label: "Specialties" },
          { href: "#buying", label: "Buying" },
          { href: "#areas", label: "Areas" },
          { href: "/contact", label: "Talk with us" },
        ]}
      />

      {/* CONNECT — the argument. Most agents list and wait; this names what is
          done instead, which is the only honest way to be a specialist rather
          than a commodity. */}
      <Section id="difference">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <EdEyebrow>Why this works</EdEyebrow>
            <Heading>Marketing is the part most agents skip</Heading>
            <p className="mt-5 text-lg text-[color:var(--fg-muted)]">
              Listing a home puts it on the MLS and waits for someone else to
              bring a buyer. That is where most of the business stops. The
              homes that sell for more are the ones that get shown to the right
              people, in the right places, before the sign ever goes up.
            </p>
            <FieldNote label="What decides the number">
              A home does not sell for what it is worth. It sells for what the
              right buyer understood about it.
            </FieldNote>
          </div>
          {/* A wide local photo when the agent has one. Until then a labelled
              slot, so the layout is right from the first build and the missing
              picture is visible as a task rather than as a broken page. */}
          <div style={{ height: "clamp(380px, 46vw, 560px)" }}>
            {site.business.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={site.business.imageUrl}
                alt={`A home in ${site.location.city}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-muted)] text-center">
                <p className="text-sm font-semibold text-[color:var(--fg-muted)]">
                  Wide local photo
                </p>
                <p className="mt-1 max-w-xs px-4 text-xs text-[color:var(--fg-subtle)]">
                  Set <code>business.imageUrl</code>. Landscape, 1600px or wider.
                </p>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* The three R's, said out loud. This is the reason the site is built as
          neighborhood-by-specialty pages rather than one page about everything,
          and stating it turns the structure into a reason to hire them. */}
      <Section muted id="how">
        <EdEyebrow>How buyers actually find you</EdEyebrow>
        <Heading>Relevancy, recency, proximity</Heading>
        <p className="mt-5 max-w-3xl text-lg text-[color:var(--fg-muted)]">
          Three things decide whether marketing reaches the person who is
          actually ready to move. Every page on this site is built to hit all
          three at once, which is why there is a page for each neighborhood
          and each situation instead of one page trying to cover everything.
        </p>
        <ThreeRs
          relevancy={`Written for one situation at a time. A first-time buyer and someone settling a parent's estate are not the same person and should not read the same page.`}
          recency={`Kept current. Market conditions from eighteen months ago are not information, they are decoration.`}
          proximity={`Specific to the street, not the county. ${site.serviceAreas.map((a) => a.name).slice(0, 4).join(", ")} and the neighborhoods inside them.`}
        />
      </Section>

      {/* The named process. A seller who can see the shape of the work is far
          more likely to start it. */}
      <Section id="process">
        <EdEyebrow>Position. Impact. Conversion.</EdEyebrow>
        <Heading>The E.P.I.C. framework</Heading>
        <p className="mt-5 max-w-2xl text-lg text-[color:var(--fg-muted)]">
          Four pillars on every home we take. Not a checklist of things agents
          are supposed to do, an argument for why your home ends up being the
          obvious choice on the market.
        </p>
        <Chapters
          steps={[
            { title: "Equity", body: "Not a CMA. Where you actually stand in the data market, the negotiation market, and the buyer's mind, so you are leading the market instead of reacting to it." },
            { title: "Presentation", body: "Perception creates value, so we control the narrative. Photography, video and copy engineered before anything goes public, for a buyer deciding with their thumb." },
            { title: "Impact", body: "We do not just market, we dominate. Targeted campaigns that put your home in front of thousands who were not searching yet, instead of hoping the MLS does the work." },
            { title: "Campaign", body: "You do not list a home, you launch it. Pre-launch buzz, a timed calendar, and offer sequencing, because the first week is the week you never get back." },
          ]}
        />
      </Section>

      {/* Buyers get their own framework, deliberately further down. Most
          traffic to an agent site is deciding whether to list, so the seller
          argument leads. A buyer who scrolls is already interested. */}
      <Section id="buying" tone="paper">
        <EdEyebrow>Buying instead?</EdEyebrow>
        <Heading>The R.E.A.L. framework</Heading>
        <p className="mt-5 max-w-2xl text-lg text-[color:var(--fg-muted)]">
          Most agents start by showing you houses. We start by getting you ready
          to win one, because the buyer who gets the good house is almost never
          the one who saw it first.
        </p>
        <Chapters
          track="buying"
          steps={[
            { title: "Ready", body: "Pre-approved and represented before we tour anything, so you can act the day the right one appears instead of scrambling." },
            { title: "Educated", body: "What your money actually buys here, honestly, before you fall in love with something out of range." },
            { title: "Aligned", body: "Fewer homes, and better ones. We build the search on your real criteria and give you an honest verdict on each one." },
            { title: "Locked", body: "Offer strategy, inspections, financing and closing, run so the ending is boring." },
          ]}
        />
        <p className="mt-8">
          <Link
            href="/process/buying"
            className="font-semibold text-[color:var(--brand-ink)] hover:underline"
          >
            Read the whole buying process, step by step
          </Link>
        </p>
      </Section>

      {/* SPECIALTIES — one grid, not two. A visitor does not think of
          themselves as "a buyer niche", they think "I am getting divorced" or
          "my mother died". One cell inverts, so the page shows a specialism
          instead of listing eleven equal options. */}
      <Section id="specialties" tone="paper">
        <div className="mb-2 max-w-3xl">
          <EdEyebrow>The situation you are actually in</EdEyebrow>
          <Heading>Different circumstances, different plans</Heading>
          <p className="mt-5 text-lg text-[color:var(--fg-muted)]">
            The fundamentals do not change. The sequence, the timing and how
            much coordination it takes change completely. Start where you
            actually are.
          </p>
        </div>
        <HighlightGrid
          featureIndex={0}
          items={[...site.sellerNiches, ...site.buyerNiches].slice(0, 8).map((n) => ({
            kicker: n.title.toUpperCase(),
            title: n.summary.split(".")[0],
            body: n.summary,
            href: site.sellerNiches.some((s) => s.slug === n.slug)
              ? `/sellers/${n.slug}`
              : `/buyers/${n.slug}`,
          }))}
        />
      </Section>

      {/* A photographic break. The page has been dense for a while; this lets
          it breathe and restates the claim in one line. */}
      <Bleed image={site.business.breakImageUrl || site.business.heroImageUrl} size="mid">
        <p className="display-h1 max-w-3xl text-3xl sm:text-5xl">
          {site.serviceAreas.length} areas. {site.sellerNiches.length + site.buyerNiches.length}{" "}
          situations. One person who has done all of it before.
        </p>
      </Bleed>

      {/* Areas */}
      <Section id="areas">
        <div className="mb-10 max-w-2xl">
          <Eyebrow>Where I work</Eyebrow>
          <Heading>Neighborhoods I know inside out</Heading>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <ShowMore visible={6} label="areas">
            {site.serviceAreas.map((a) => (
            <Link key={a.slug} href={`/areas/${a.slug}`}>
              <Card>
                <h3 className="text-lg font-semibold text-[color:var(--fg)]">{a.name}</h3>
                <p className="mt-2 text-sm text-[color:var(--fg-muted)]">{a.blurb}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-[color:var(--brand-ink)]">
                  Explore {a.name} →
                </span>
              </Card>
            </Link>
          ))}
          </ShowMore>
        </div>
      </Section>

      {/* Blog + Map */}
      <Section muted>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>From the blog</Eyebrow>
            <Heading>Local market insight</Heading>
            <div className="mt-8 space-y-6">
              {posts.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="block">
                  <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--fg-subtle)]">
                    {p.date} · {p.readMinutes} min read
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[color:var(--fg)] hover:text-[color:var(--brand-ink)]">
                    {p.title}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--fg-muted)]">{p.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <Eyebrow>Find me</Eyebrow>
            <Heading>Right here in {site.location.city}</Heading>
            <div className="mt-8">
              <MapEmbed height={340} label="Google Business Profile" />
            </div>
          </div>
        </div>
      </Section>

      {/* Long-form home body (SEO): rich content when written, scaffold when not */}
      {(() => {
        const home = getPageContent("/");
        return (
          <Section>
            <div className="container-page">
              {!home && <ScaffoldBanner />}
            </div>
            <RichContent
              content={
                home ??
                scaffoldFor("home", { city: site.location.city })
              }
            />
          </Section>
        );
      })()}

      {/* CTA */}
      <section className="bg-[var(--brand)]">
        <div className="container-page flex flex-col items-center justify-between gap-6 py-14 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="text-2xl font-bold text-white">Thinking about a move?</h2>
            <p className="mt-1 text-white/80">
              Let&apos;s figure out your next step together. No pressure.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-md bg-[color:var(--surface)] px-6 py-3 text-sm font-semibold text-[color:var(--brand-ink)] hover:bg-[color:var(--surface-muted)]"
          >
            Get in touch
          </Link>
        </div>
      </section>
    </>
  );
}
