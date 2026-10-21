import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { site, getFunnel } from "@/site.config";
import { JsonLd } from "@/components/JsonLd";
import { FunnelForm } from "@/components/FunnelForm";
import { pageSchema } from "@/lib/schema";

export function generateStaticParams() {
  return site.funnels.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const f = getFunnel(slug);
  return {
    title: f ? f.title : "Free Guide",
    description: f?.subtitle,
  };
}

export default async function FunnelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const funnel = getFunnel(slug);
  if (!funnel) notFound();

  const isEvent = funnel.goal === "event";

  return (
    <>
      <JsonLd
        data={pageSchema({
          path: `/free/${funnel.slug}`,
          title: funnel.title,
          description: funnel.subtitle,
          crumbs: [
            { name: "Home", path: "/" },
            { name: funnel.title, path: `/free/${funnel.slug}` },
          ],
        })}
      />

      <section className="bg-gradient-to-b from-[color:var(--surface-muted)] to-[color:var(--bg)]">
        <div className="container-page grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          {/* Offer */}
          <div>
            <p className="eyebrow-tick mb-3 text-sm font-semibold uppercase tracking-widest text-[color:var(--accent-text)]">
              {isEvent ? "You're invited" : "Free guide"}
            </p>
            <h1 className="display-h1">
              {funnel.title}
            </h1>
            <p className="mt-4 text-lg text-[color:var(--fg-muted)]">{funnel.subtitle}</p>

            {isEvent && funnel.event && (
              <dl className="mt-8 grid gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 sm:grid-cols-2">
                <EventFact term="What" value={funnel.event.format} />
                <EventFact term="When" value={`${funnel.event.date} · ${funnel.event.time}`} />
                <EventFact term="Where" value={funnel.event.location} />
                <EventFact term="Cost" value="Free, RSVP required" />
              </dl>
            )}

            <ul className="mt-8 space-y-3">
              {funnel.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 text-[color:var(--accent-text)]">✓</span>
                  <span className="text-[color:var(--fg-muted)]">{b}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-[color:var(--fg-subtle)]">
              From {site.brand.logoText}, {site.location.city}.
            </p>
          </div>

          {/* Opt-in / RSVP */}
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-8">
            <p className="mb-1 text-lg font-semibold text-[color:var(--fg)]">
              {isEvent ? "Save your seat" : "Get the guide free"}
            </p>
            <p className="mb-5 text-sm text-[color:var(--fg-subtle)]">
              {isEvent ? "A few quick details and your seat is reserved." : "Tell us where to send it."}
            </p>
            <FunnelForm funnel={funnel} />
          </div>
        </div>
      </section>
    </>
  );
}

function EventFact({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-[color:var(--accent-text)]">
        {term}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-[color:var(--fg)]">{value}</dd>
    </div>
  );
}
