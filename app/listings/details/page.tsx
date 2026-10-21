import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/site.config";
import { listings } from "@/content/listings";
import { listingsBrief } from "@/lib/listing-brief";

/**
 * /listings/details — the machine-readable listing feed.
 *
 * ONE URL an external AI can be pointed at. A GoHighLevel knowledge base, a
 * voice agent, or any RAG crawler set to this address gets every listing with
 * every field, and gets the current version on every crawl, because this page
 * is generated from content/listings.ts rather than typed by anyone.
 *
 * That is the whole reason it exists. The alternative — pasting listing data
 * into the CRM by hand — has to be redone on every price change, every status
 * change and every new listing, so the CRM drifts out of step with the website
 * almost immediately and the assistant starts quoting prices that are no longer
 * true. This cannot drift.
 *
 * It is intentionally plain. No cards, no photos, no styling worth speaking of:
 * a crawler extracts text, and decoration only adds noise to what it extracts.
 * Humans have /listings.
 *
 * Everything here is public — see the warning in lib/listing-brief.ts about
 * what must never be written into the showing instructions.
 */

export const metadata: Metadata = {
  title: "Listing details (data feed)",
  description:
    "Full structured detail for every current listing, for use by AI assistants and voice agents.",
};

export default function ListingDetailsPage() {
  const brief = listingsBrief();

  return (
    <div className="container-page py-12">
      <Link
        href="/listings"
        className="text-sm font-medium text-[color:var(--fg-subtle)] hover:text-[color:var(--brand)]"
      >
        ← All listings
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-[color:var(--fg)]">
        Listing details feed
      </h1>
      <p className="mt-2 max-w-2xl text-[color:var(--fg-muted)]">
        Every current listing from {site.brand.logoText}, with full detail, in one
        place. This page is generated from the site&rsquo;s own listing data and
        updates whenever a listing changes, so an AI assistant pointed at this
        address always reads the current version. For photos and a normal view,
        use{" "}
        <Link href="/listings" className="underline">
          the listings page
        </Link>
        .
      </p>

      {listings.length === 0 ? (
        <p className="mt-8 text-[color:var(--fg-muted)]">
          There are no listings on the site right now.
        </p>
      ) : (
        <pre className="mt-8 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-6 text-sm leading-relaxed text-[color:var(--fg-muted)]">
          {brief}
        </pre>
      )}
    </div>
  );
}
