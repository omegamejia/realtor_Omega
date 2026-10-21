import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/site.config";
import { listings, getListing } from "@/content/listings";
import { listingBrief, STATUS_KEY } from "@/lib/listing-brief";

/**
 * /listings/<slug>/details — ONE page per listing, holding that listing's whole
 * record and nothing else.
 *
 * This exists because /ai-brief did not survive contact with a real retriever.
 * That page is one ~23,000 character document, and a knowledge base splits it
 * into chunks wherever it likes. When a chunk boundary lands mid-listing, the
 * retriever hands the model fragments of several homes at once and it stitches
 * them into a single confident answer: the right address, a price from nowhere,
 * a pool that belongs to a different house, a list date borrowed from the
 * listing below it. Every number wrong, delivered without a trace of doubt.
 *
 * A caller can drive to an address on the strength of that, so it is not a
 * cosmetic problem.
 *
 * One listing per page fixes it structurally rather than by instruction. Each
 * document is small enough to survive chunking whole, and it opens with the
 * address, so a retriever matching "Tamarind Way" returns THAT record complete
 * instead of a slice of it next to a slice of something else. There is no
 * cross-listing bleed available, because no other listing is on the page.
 *
 * /ai-brief stays for the company-level facts (business, team, areas served,
 * services). Those are short, distinct, and do not suffer this failure.
 *
 * PUBLIC. See the warning in lib/listing-brief.ts about what must never go into
 * a listing's showing instructions.
 */

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
    title: l ? `${l.address}, ${l.city} — full detail (data feed)` : "Listing detail",
    description: l
      ? `Complete structured detail for ${l.address}, ${l.city}, for AI assistants and voice agents.`
      : undefined,
  };
}

export default async function ListingDetailFeed({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const l = getListing(slug);
  if (!l) notFound();

  return (
    <div className="container-page py-12">
      <Link
        href={`/listings/${l.slug}`}
        className="text-sm font-medium text-[color:var(--fg-subtle)] hover:text-[color:var(--brand-ink)]"
      >
        ← {l.address}
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-[color:var(--fg)]">
        {l.address}, {l.city}: full detail
      </h1>
      <p className="mt-2 max-w-2xl text-[color:var(--fg-muted)]">
        Every recorded detail for this one property, from {site.brand.logoText}.
        Generated from the site&rsquo;s own listing data, so it is always
        current. For photos and a normal view, see{" "}
        <Link href={`/listings/${l.slug}`} className="underline">
          the listing page
        </Link>
        .
      </p>

      {/* The status key rides on every page. A retriever may hand the model this
          record alone, with no other context, and it still has to know that
          "Pending" does not automatically mean no. */}
      <pre className="mt-8 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-6 text-sm leading-relaxed text-[color:var(--fg-muted)]">
        {`${listingBrief(l)}\n\n${STATUS_KEY}`}
      </pre>
    </div>
  );
}
