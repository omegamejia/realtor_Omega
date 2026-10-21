"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { type Listing, formatPrice } from "@/content/listings";
import { Mic } from "@/components/Icons";

/**
 * Voice + text search over the agent's OWN listings (content/listings.ts).
 * Voice uses the browser Web Speech API when available and just fills the box
 * (graceful fallback to typing). Parses simple criteria: beds, baths, and a max
 * price, plus keyword match on address/city/description.
 *
 * NOTE: this searches the agent's manual listings, NOT the MLS. A full
 * MLS/IDX-backed search is a separate integration (see listings-manager skill).
 */
export function ListingSearch({ listings }: { listings: Listing[] }) {
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);

  const results = useMemo(() => filterListings(listings, query), [listings, query]);

  function startVoice() {
    // @ts-expect-error - vendor-prefixed on some browsers
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      alert("Voice search isn't supported in this browser. Please type your search.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e: { results: { 0: { 0: { transcript: string } } } }) => {
      setQuery(e.results[0][0].transcript);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Try "3 bed 2 bath under 800k" or a neighborhood'
          className="field"
        />
        <button
          type="button"
          onClick={startVoice}
          aria-label="Voice search"
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md border ${
            listening
              ? "border-[var(--brand)] bg-[var(--brand)] text-white"
              : "border-[color:var(--border-strong)] text-[color:var(--fg-muted)] hover:border-[var(--brand)]"
          }`}
        >
          <Mic size={20} aria-hidden />
        </button>
      </div>

      <p className="mt-3 text-sm text-[color:var(--fg-subtle)]">
        {results.length} {results.length === 1 ? "listing" : "listings"}
        {query ? " match your search" : ""}
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((l) => (
          <Link key={l.slug} href={`/listings/${l.slug}`}>
            <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition-shadow hover:shadow-md">
              <div className="flex aspect-[4/3] items-center justify-center bg-[color:var(--surface-muted)] text-[color:var(--fg-subtle)]">
                {l.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.imageUrl} alt={l.address} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm">Photo</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-[color:var(--fg)]">{formatPrice(l.price)}</p>
                  <StatusBadge status={l.status} />
                </div>
                <p className="mt-1 text-sm text-[color:var(--fg-muted)]">{l.address}</p>
                <p className="mt-2 text-sm text-[color:var(--fg-subtle)]">
                  {l.beds} bd · {l.baths} ba · {l.sqft.toLocaleString()} sqft
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {results.length === 0 && (
        <p className="mt-8 text-center text-[color:var(--fg-subtle)]">
          No listings match that search. Try fewer filters.
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Listing["status"] }) {
  const label = status[0].toUpperCase() + status.slice(1);
  const cls =
    status === "active"
      ? "bg-green-100 text-green-800"
      : status === "pending"
        ? "bg-amber-100 text-amber-800"
        : "bg-neutral-200 text-neutral-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

function filterListings(listings: Listing[], q: string): Listing[] {
  const s = q.toLowerCase().trim();
  if (!s) return listings;

  const bedMatch = s.match(/(\d+)\s*(?:\+|plus)?\s*(?:bd|bed|beds|bedroom)/);
  const bathMatch = s.match(/(\d+)\s*(?:\+|plus)?\s*(?:ba|bath|baths|bathroom)/);
  const priceMatch = s.match(/(?:under|below|max|up to)\s*\$?\s*([\d.,]+)\s*(k|m)?/);

  const minBeds = bedMatch ? parseInt(bedMatch[1], 10) : undefined;
  const minBaths = bathMatch ? parseInt(bathMatch[1], 10) : undefined;
  let maxPrice: number | undefined;
  if (priceMatch) {
    let n = parseFloat(priceMatch[1].replace(/,/g, ""));
    if (priceMatch[2] === "k") n *= 1_000;
    if (priceMatch[2] === "m") n *= 1_000_000;
    maxPrice = n;
  }

  // Remaining words (minus the parsed filters) become keyword terms.
  const keywords = s
    .replace(/(\d+)\s*(?:\+|plus)?\s*(?:bd|bed|beds|bedroom|ba|bath|baths|bathroom)/g, "")
    .replace(/(?:under|below|max|up to)\s*\$?\s*[\d.,]+\s*(?:k|m)?/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  return listings.filter((l) => {
    if (minBeds !== undefined && l.beds < minBeds) return false;
    if (minBaths !== undefined && l.baths < minBaths) return false;
    if (maxPrice !== undefined && l.price > 0 && l.price > maxPrice) return false;
    if (keywords.length) {
      const hay = `${l.address} ${l.city} ${l.description.join(" ")}`.toLowerCase();
      if (!keywords.every((k) => hay.includes(k))) return false;
    }
    return true;
  });
}
