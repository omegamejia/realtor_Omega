import Link from "next/link";
import { site, agentCredential } from "@/site.config";
import { posts } from "@/content/posts";
import { Section, Eyebrow, Heading, ButtonLink, Card } from "@/components/ui";
import { MapEmbed } from "@/components/MapEmbed";
import { JsonLd } from "@/components/JsonLd";
import { RichContent } from "@/components/RichContent";
import { ScaffoldBanner } from "@/components/ScaffoldBanner";
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
      {/* Hero — routes buyers vs sellers */}
      <section className="relative overflow-hidden border-b border-[color:var(--border)] bg-gradient-to-b from-[color:var(--surface-muted)] to-[color:var(--bg)]">
        <div className="container-page grid items-center gap-10 py-20 md:grid-cols-2 md:py-28">
          <div>
            <Eyebrow>
              {agentCredential()} · {site.location.city}, {site.location.state}
            </Eyebrow>
            {/* Two-tone headline: lead in the text color, key phrase in the brand
                accent. Both parts come from site.config → hero, so it re-themes
                and rewrites per agent. Falls back to the tagline if unset. */}
            <h1 className="display-h1 display-hero">
              {site.hero?.headlineLead ?? site.agent.tagline}
              {site.hero?.headlineAccent ? (
                <> <span className="hl-accent">{site.hero.headlineAccent}</span></>
              ) : null}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-[color:var(--fg-muted)]">
              {site.hero?.subhead ?? site.agent.bio[0]}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/buyers">I&apos;m buying</ButtonLink>
              <ButtonLink href="/sellers" variant="outline">
                I&apos;m selling
              </ButtonLink>
            </div>
          </div>

          <div className="relative">
            {/* Decorative accent frame — gives the hero presence even before a
                headshot is added. Offset tint block behind the photo card. */}
            <div
              aria-hidden
              className="absolute -right-3 -top-3 h-full w-full rounded-2xl bg-[color:var(--brand-tint)]"
            />
            <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--surface-muted)] shadow-sm">
              {site.agent.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={site.agent.photoUrl}
                  alt={site.agent.name}
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="text-center text-[color:var(--fg-subtle)]">
                  <p className="text-5xl">📷</p>
                  <p className="mt-2 text-sm font-medium">Agent headshot</p>
                  <p className="text-xs">set agent.photoUrl</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Buyers */}
      <Section>
        <div className="mb-10 flex items-end justify-between">
          <div className="max-w-2xl">
            <Eyebrow>For buyers</Eyebrow>
            <Heading>Find the right home</Heading>
          </div>
          <Link
            href="/buyers"
            className="hidden text-sm font-semibold text-[color:var(--brand)] hover:underline sm:inline"
          >
            All buyer resources →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {site.buyerNiches.map((n) => (
            <Link key={n.slug} href={`/buyers/${n.slug}`}>
              <Card>
                <h3 className="text-lg font-semibold text-[color:var(--fg)]">{n.title}</h3>
                <p className="mt-2 text-sm text-[color:var(--fg-muted)]">{n.summary}</p>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      {/* Sellers */}
      <Section muted>
        <div className="mb-10 flex items-end justify-between">
          <div className="max-w-2xl">
            <Eyebrow>For sellers</Eyebrow>
            <Heading>Sell for the most the market will pay</Heading>
          </div>
          <Link
            href="/sellers"
            className="hidden text-sm font-semibold text-[color:var(--brand)] hover:underline sm:inline"
          >
            All seller resources →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {site.sellerNiches.map((n) => (
            <Link key={n.slug} href={`/sellers/${n.slug}`}>
              <Card>
                <h3 className="text-lg font-semibold text-[color:var(--fg)]">{n.title}</h3>
                <p className="mt-2 text-sm text-[color:var(--fg-muted)]">{n.summary}</p>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      {/* Areas */}
      <Section>
        <div className="mb-10 max-w-2xl">
          <Eyebrow>Where I work</Eyebrow>
          <Heading>Neighborhoods I know inside out</Heading>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {site.serviceAreas.map((a) => (
            <Link key={a.slug} href={`/areas/${a.slug}`}>
              <Card>
                <h3 className="text-lg font-semibold text-[color:var(--fg)]">{a.name}</h3>
                <p className="mt-2 text-sm text-[color:var(--fg-muted)]">{a.blurb}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-[color:var(--brand)]">
                  Explore {a.name} →
                </span>
              </Card>
            </Link>
          ))}
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
                  <p className="mt-1 text-lg font-semibold text-[color:var(--fg)] hover:text-[color:var(--brand)]">
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
            className="inline-flex items-center rounded-md bg-[color:var(--surface)] px-6 py-3 text-sm font-semibold text-[color:var(--brand)] hover:bg-[color:var(--surface-muted)]"
          >
            Get in touch
          </Link>
        </div>
      </section>
    </>
  );
}
