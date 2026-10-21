import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/site.config";
import { listings, getListing, formatPrice } from "@/content/listings";
import { ButtonLink } from "@/components/ui";
import { MapEmbed } from "@/components/MapEmbed";
import { JsonLd } from "@/components/JsonLd";
import { RelatedLinks } from "@/components/RelatedLinks";
import { listingSchema } from "@/lib/schema";

export function generateStaticParams() {
  return listings.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const l = getListing(slug);
  return {
    title: l ? `${l.address}: ${formatPrice(l.price)}` : "Listings",
    description: l?.description?.[0],
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const l = getListing(slug);
  if (!l) notFound();

  return (
    <>
      <JsonLd data={listingSchema(l)} />

      <section className="border-b border-[color:var(--border)] bg-[color:var(--surface-muted)]">
        <div className="container-page py-12">
          <Link
            href="/listings"
            className="text-sm font-medium text-[color:var(--fg-subtle)] hover:text-[color:var(--brand)]"
          >
            ← All listings
          </Link>
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-[color:var(--fg)]">
              {l.address}
            </h1>
            <p className="text-3xl font-bold text-[color:var(--brand)]">
              {formatPrice(l.price)}
            </p>
          </div>
          <p className="mt-1 text-[color:var(--fg-muted)]">
            {l.city} · {l.beds} bd · {l.baths} ba · {l.sqft.toLocaleString()} sqft
            {l.lotSqft ? ` · ${l.lotSqft.toLocaleString()} lot` : ""}
            {l.garage ? ` · ${l.garage} car` : ""}
          </p>
          <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-[color:var(--fg-subtle)]">
            {l.status}
          </p>
        </div>
      </section>

      <div className="container-page grid gap-12 py-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex aspect-[16/9] items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--fg-subtle)]">
            {l.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.imageUrl} alt={l.address} className="h-full w-full rounded-xl object-cover" />
            ) : (
              <span className="text-sm">Listing photo</span>
            )}
          </div>
          <div className="mt-6 space-y-4 text-[color:var(--fg-muted)]">
            {l.description.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="mt-8">
            <ButtonLink href="/contact">Ask about this home</ButtonLink>
          </div>
        </div>
        <aside>
          <MapEmbed height={280} query={l.mapQuery} label={l.address} />
        </aside>
      </div>

      <RelatedLinks
        links={[
          { label: "All listings", href: "/listings" },
          { label: "Buying a home", href: "/buyers/buying-a-home" },
        ]}
      />
    </>
  );
}
