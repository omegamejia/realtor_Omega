import type { Metadata } from "next";
import Link from "next/link";
import { site, agentCredential, allNiches, isSellerNiche } from "@/site.config";
import { posts } from "@/content/posts";
import { MapEmbed } from "@/components/MapEmbed";
import { JsonLd } from "@/components/JsonLd";
import { RichContent } from "@/components/RichContent";
import { ScaffoldBanner } from "@/components/ScaffoldBanner";
import { ScrollRail } from "@/components/ScrollRail";
import { Reveal } from "@/components/Reveal";
import { HeroSlideshow, FadeCarousel } from "@/components/tb-client";
import {
  Statement,
  StatGrid,
  PhotoTicker,
  SplitFeature,
  QuoteFeature,
  VideoBand,
  ImageCard,
  Pillars,
  InquireSection,
} from "@/components/tb";
import { sampleSrc, SAMPLE_VIDEOS } from "@/content/sample-media";
import { pageSchema } from "@/lib/schema";
import { getPageContent } from "@/content/pages";
import { scaffoldFor } from "@/lib/scaffold";

export async function generateMetadata(): Promise<Metadata> {
  const c = getPageContent("/");
  return {
    title: c?.metaTitle ?? `${site.agent.name}: ${site.agent.tagline}`,
    description: c?.metaDescription ?? site.agent.bio[0],
  };
}

/** The agent's own photographs, when they have added any. */
const lib = (n: number) => `/images/library/library-${String(n).padStart(2, "0")}.jpg`;

/** Each pillar links at the step of the process it describes. */
const PILLAR_LINKS = ["/process#get-in-touch", "/process#assess", "/process#do-the-work", "/process#after"];

export default function HomePage() {
  /* ONE PHOTOGRAPH, ONE PLACE.
     Slots fill in the order they appear on the page and the agent's own photo
     always wins, falling back to the licensed sample in content/sample-media.json.
     A picture already used higher up is skipped, so the areas rail never repeats
     something the page has just shown. Samples cannot reach the live site: the
     launch checklist fails on them, and `npm run shot-list` turns the same
     registry into the brief the photographer shoots from. */
  const used = new Set<string>();
  const pick = (...candidates: (string | undefined)[]) => {
    for (const c of candidates) {
      if (c && !used.has(c)) {
        used.add(c);
        return c;
      }
    }
    return "";
  };

  const heroImages = [
    { src: pick(site.business?.heroImageUrl, sampleSrc("home.hero.2"), lib(1)), alt: "A home at dusk with the lights on" },
    { src: pick(sampleSrc("home.hero.3"), lib(2)), alt: "A bright, open living room" },
    { src: pick(sampleSrc("home.epic.impact"), lib(3)), alt: "A twilight exterior" },
  ].filter((i) => i.src);

  const carousel = [
    { src: pick(sampleSrc("home.epic.presentation"), lib(4)), alt: "A staged kitchen" },
    { src: pick(sampleSrc("home.real.ready"), lib(5)), alt: "An open front door" },
    { src: pick(sampleSrc("home.real.aligned"), lib(6)), alt: "A set dining table" },
    { src: pick(sampleSrc("home.epic.equity"), lib(7)), alt: "A home with strong curb appeal" },
  ].filter((i) => i.src);

  const quoteImage = pick(sampleSrc("home.quote"), lib(8));
  const splitImage = pick(sampleSrc("home.difference"), lib(9));

  const nicheHref = (slug: string) => (isSellerNiche(slug) ? `/sellers/${slug}` : `/buyers/${slug}`);
  const ticker = allNiches.map((n) => ({
    src: pick(sampleSrc(`niche.${n.slug}`)),
    alt: "",
    href: nicheHref(n.slug),
    caption: n.menuLabel,
  }));

  const areas = site.serviceAreas.slice(0, 12).map((a) => ({
    area: a,
    src: pick(a.heroImage, sampleSrc(`area.${a.slug}.1`)),
  }));

  /* Only numbers that are either the agent's own stated figures or counted from
     this site. Nothing is estimated. A zero means they have not given it yet,
     and it is left out rather than shown as nothing. */
  /* ONLY FIGURES THE AGENT HAS STATED.
     This used to pad itself with counts of the site's own structure: how many
     areas, how many niches, how many posts. That is not proof, it is the site
     congratulating itself for existing, and it rendered "1 LOCAL MARKET
     ARTICLES" in inch-high type on a real build. A number on a page is a claim;
     a number about the page is filler. Under two real figures and the band does
     not render. */
  const stats = (site.home?.stats ?? [])
    .filter((s) => s.value > 0)
    .map((s) => ({ value: s.value, from: Math.round(s.value * 0.6), suffix: s.suffix, label: s.label }));

  const home = getPageContent("/");

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

      {/* The photograph holds still while the page rises over it. */}
      <HeroSlideshow
        sticky
        images={heroImages}
        eyebrow={`${agentCredential()} · ${site.location.city}, ${site.location.state}`}
        title={
          <>
            {site.hero.headlineLead}
            {site.hero.headlineAccent ? (
              <> <span className="hl-accent">{site.hero.headlineAccent}</span></>
            ) : null}
          </>
        }
        actions={
          <>
            <Link href="/sellers" className="tb-link">Sell My Home</Link>
            <Link href="/buyers" className="tb-link">Find Me a Home</Link>
          </>
        }
      />

      <Statement
        links={[
          { href: "/process", label: "How We Work" },
          { href: "/contact", label: "Talk With Us" },
        ]}
      >
        {site.hero.subhead}
      </Statement>

      <VideoBand
        src={SAMPLE_VIDEOS.aerial.src}
        poster={SAMPLE_VIDEOS.aerial.poster}
        label="Aerial footage over a residential neighborhood"
      />

      {stats.length >= 2 ? (
        <StatGrid id="numbers" tone="light" eyebrow="By the numbers" stats={stats} />
      ) : null}

      <Statement id="difference" as="h2" eyebrow="Why this works">
        {site.home.statement}
      </Statement>

      {carousel.length ? (
        <FadeCarousel images={carousel} label="Homes we have prepared and marketed" />
      ) : null}

      <section className="tb-band">
        <Reveal className="tb-boxed tb-stack tb-center">
          <p className="tb-eyebrow">{site.home.pillarsEyebrow}</p>
        </Reveal>
        <Reveal className="tb-boxed">
          <Pillars
            items={site.home.pillars.map((pl, i) => ({
              title: pl.title,
              body: pl.body,
              href: PILLAR_LINKS[i] ?? "/process",
              img: { src: pick(sampleSrc(`home.pillar.${i + 1}`), lib(10 + i)), alt: "" },
            }))}
          />
        </Reveal>
      </section>

      <QuoteFeature
        quote={site.home.quote}
        cite={`${site.agent.name}, ${agentCredential()}`}
        media={{ src: quoteImage, alt: "" }}
      />

      <PhotoTicker items={ticker} label="Situations we plan for" seconds={110} band="light" />

      <SplitFeature
        media={{ src: splitImage, alt: "" }}
        eyebrow="How we work"
        heading="Every step, written down before it happens"
        link={{ href: "/process", label: "See The Method" }}
      >
        {site.agent.bio[0]}
      </SplitFeature>

      <section className="tb-band tb-band--alt">
        <Reveal className="tb-boxed tb-stack tb-left">
          <ScrollRail label="Service areas">
            {areas.map(({ area, src }) => (
              <ImageCard
                key={area.slug}
                href={`/areas/${area.slug}`}
                img={{ src, alt: "" }}
                title={area.name}
                text={area.blurb}
              />
            ))}
          </ScrollRail>
        </Reveal>
      </section>

      <section className="tb-band">
        <Reveal className="tb-boxed grid gap-14 lg:grid-cols-2">
          <div>
            <h2 className="tb-h2">Latest from the blog</h2>
            <ul className="tb-list">
              {posts.slice(0, 4).map((p) => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.slug}`} className="tb-link">{p.title}</Link>
                </li>
              ))}
            </ul>
            <Link href="/blog" className="tb-link">All Articles</Link>
          </div>
          <MapEmbed height={440} label="Google Business Profile" />
        </Reveal>
      </section>

      <section className="tb-band">
        <div className="tb-boxed">
          {!home && <ScaffoldBanner />}
          <RichContent content={home ?? scaffoldFor("home", { city: site.location.city })} />
        </div>
      </section>

      <InquireSection />
    </>
  );
}
