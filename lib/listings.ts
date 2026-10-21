/**
 * The SHAPE of a listing, and everything that operates on one.
 *
 * WHY THIS IS NOT IN content/listings.ts. `content/` is the agent's own
 * business data and `npm run update:engine` never touches it, by design: an
 * engine update must not be able to overwrite somebody's listings. But the TYPE
 * is engine machinery, and it changes when the engine learns to do something new.
 *
 * When the type lived alongside the data, the two could not move independently.
 * Adding a required field to the engine meant every existing site pulled an
 * engine that demanded a field its own type definition had never heard of, and
 * the build broke on a file the updater was not allowed to fix.
 *
 * So: the shape and the behaviour live here and update freely. `content/listings.ts`
 * holds only the records, and stays the agent's.
 */

export type ListingStatus = "coming-soon" | "active" | "pending" | "sold";

export const STATUS_LABEL: Record<ListingStatus, string> = {
  "coming-soon": "Coming soon",
  active: "For sale",
  pending: "Pending",
  sold: "Sold",
};

export type Listing = {
  slug: string;
  status: ListingStatus;
  /** Free text on the status — the single most asked follow-up on a phone call. */
  statusDetail?: string;

  address: string;
  city: string;
  /** Matches a serviceAreas name in site.config.ts where one applies. */
  neighborhood?: string;

  price: number; // list price in USD
  beds: number;
  baths: number; // full baths
  halfBaths?: number;
  sqft: number;
  lotSqft?: number;
  garage?: number; // covered spaces

  propertyType: string;
  stories: number;
  yearBuilt: number;

  hoa?: {
    fee: number; // USD
    frequency: "monthly" | "quarterly" | "annual";
    includes: string[];
    rentalRestrictions?: string;
    ageRestricted?: string;
  };
  /** BACKEND — annual property tax and any Mello-Roos, asked constantly. */
  taxes?: { annualEstimate: number; melloRoos?: string };
  /** BACKEND — district only. Assignment is per-address; verify before quoting. */
  schools?: { district: string; note?: string };

  features: string[];
  description: string[];

  imageUrl?: string; // public/images/listings/<slug>.jpg

  /**
   * The map search string, and the coordinates behind it.
   *
   * `mapQuery` is what a human map embed searches for. `geo` is what a machine
   * needs, and `npm run launch:check` fails without real values.
   *
   * OPTIONAL IN THE TYPE, REQUIRED BY THE GATE, and that split is deliberate. A
   * required field here would break the build of every existing site the moment
   * they pulled this update, on a file the engine updater is not allowed to
   * touch. The gate reports it in plain language instead, per listing, and the
   * site keeps building while the agent fixes it.
   *
   * Get the coordinates by opening the address in Google Maps and copying them
   * out of the URL. Never estimate them from the town centre: a listing pinned
   * to the middle of town is confidently wrong in a way nobody notices.
   */
  mapQuery: string;
  geo?: { lat: string; lng: string };

  listedDate?: string; // YYYY-MM-DD
  soldDate?: string;
  soldPrice?: number;
  mlsNumber?: string;

  openHouse?: { date: string; start: string; end: string }[];

  /** BACKEND — how to actually get someone in the door. */
  showing?: {
    instructions: string;
    occupancy: "owner-occupied" | "tenant-occupied" | "vacant";
    petOnSite?: string;
    noticeRequired?: string;
  };
  /** BACKEND — what we already know is wrong with it. Callers ask; be straight. */
  disclosures?: string[];
  /** BACKEND — price changes, so "has it come down?" has a real answer. */
  priceHistory?: { date: string; price: number; note: string }[];
  /** BACKEND — what a caller means by "what's around it". */
  nearby?: string[];
};

/** True when a listing carries usable coordinates ("0" is the seed placeholder). */
export function hasRealGeo(l: Pick<Listing, "geo">): boolean {
  return Boolean(l.geo?.lat && l.geo?.lng && l.geo.lat !== "0" && l.geo.lng !== "0");
}

export function formatPrice(n: number): string {
  return n > 0 ? `$${n.toLocaleString("en-US")}` : "Price on request";
}

/** Lot size reads better in acres once it is over about a quarter acre. */
export function formatLot(sqft: number): string {
  return sqft >= 10890
    ? `${(sqft / 43560).toFixed(sqft / 43560 >= 1 ? 1 : 2)} acres`
    : `${sqft.toLocaleString("en-US")} sqft lot`;
}
