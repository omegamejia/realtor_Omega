/**
 * Listings , the agent's own properties, managed through Claude (the
 * `listings-manager` skill adds/updates/marks-sold these).
 *
 * This is MANUAL listing data the agent controls. It is NOT an IDX/MLS feed ,
 * see the listings-manager skill for the IDX/MLS integration notes and blockers.
 *
 * SEED STATE: one example listing (bracketed = placeholder) so /listings renders
 * and the launch gate flags it until real listings replace it.
 */

export type ListingStatus = "active" | "pending" | "sold";

export type Listing = {
  slug: string;
  status: ListingStatus;
  address: string;
  city: string;
  price: number; // list price in USD
  beds: number;
  baths: number;
  sqft: number;
  lotSqft?: number;
  garage?: number;
  description: string[];
  imageUrl?: string; // put the file in public/images/listings/ and use /images/listings/<slug>.jpg
  mapQuery: string;
  listedDate?: string; // YYYY-MM-DD
  soldDate?: string;
  soldPrice?: number;
};

export const listings: Listing[] = [
  {
    // EXAMPLE listing , replace the WHOLE object via the listings-manager skill,
    // not field-by-field. The numeric specs below (price/beds/baths/sqft/dates)
    // are placeholder VALUES: the launch gate can't flag a wrong number the way
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
    description: [
      "[EXAMPLE listing: replace via the listings-manager skill. Describe the home in the agent's voice: what makes it special, the neighborhood, who it suits.]",
    ],
    imageUrl: "",
    mapQuery: "[123 Example St, City, ST]",
    listedDate: "2026-01-01",
  },
];

export function getListing(slug: string): Listing | undefined {
  return listings.find((l) => l.slug === slug);
}

export function activeListings(): Listing[] {
  return listings.filter((l) => l.status !== "sold");
}

export function formatPrice(n: number): string {
  return n > 0 ? `$${n.toLocaleString("en-US")}` : "Price on request";
}
