/**
 * Listings — the agent's own properties, managed through Claude (the
 * `listings-manager` skill adds/updates/marks-sold these).
 *
 * THIS FILE IS YOURS. `npm run update:engine` never touches it. The shape of a
 * listing and everything that operates on one live in `lib/listings.ts`, which
 * is engine machinery and does update, so the two can move independently.
 *
 * This is MANUAL listing data the agent controls. It is NOT an IDX/MLS feed —
 * see the listings-manager skill for the IDX/MLS integration notes and blockers.
 *
 * WHY THE RECORD IS THIS DETAILED. Six things read it and none of them can
 * answer a question about a field that does not exist: the listing page, the map
 * pin (which uses `geo`, not the address text), the structured data, the
 * crawlable /listings/details page, /ai-brief, and the on-site chat. A caller
 * asks "is there an HOA" or "can I still make an offer", so anything a caller
 * might ask has to be a field here, or the answer is "I don't know".
 *
 * Fields marked BACKEND in lib/listings.ts are deliberately not rendered on the
 * page but ARE given to the assistants.
 *
 * FOUR OF THOSE SIX CONSUMERS ARE INVISIBLE, which is why `npm run launch:check`
 * checks them mechanically. A listing added without coordinates looks completely
 * fine on screen and leaves the map, the schema and the assistants all guessing.
 */

import type { Listing } from "@/lib/listings";

export { STATUS_LABEL, formatPrice, formatLot } from "@/lib/listings";
export type { Listing, ListingStatus } from "@/lib/listings";

export const listings: Listing[] = [
  {
    // EXAMPLE listing. Replace the WHOLE object via the listings-manager skill,
    // not field-by-field. The numeric specs below (price/beds/baths/sqft/dates)
    // are placeholder VALUES: the launch gate cannot flag a wrong number the way
    // it flags [bracket] text, so never keep these next to a real address.
    slug: "example-listing",
    status: "active",
    address: "[123 Example St]",
    city: "[City]",
    price: 750000,
    beds: 4,
    baths: 3,
    sqft: 2400,
    lotSqft: 6000,
    garage: 2,
    propertyType: "[Single-family home]",
    stories: 1,
    yearBuilt: 1999,
    features: ["[Feature the agent confirmed]"],
    description: [
      "[EXAMPLE listing: replace via the listings-manager skill. Describe the home in the agent's voice: what makes it special, the neighborhood, who it suits.]",
    ],
    imageUrl: "",
    mapQuery: "[123 Example St, City, ST]",
    // Placeholder coordinates. The gate rejects any REAL listing still sitting
    // at 0,0, so a forgotten geocode cannot reach a live site.
    geo: { lat: "0", lng: "0" },
    listedDate: "2026-01-01",
  },
];

export function getListing(slug: string): Listing | undefined {
  return listings.find((l) => l.slug === slug);
}

export function activeListings(): Listing[] {
  return listings.filter((l) => l.status !== "sold");
}

export function soldListings(): Listing[] {
  return listings.filter((l) => l.status === "sold");
}
