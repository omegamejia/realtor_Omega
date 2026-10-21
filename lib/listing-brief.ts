/**
 * The full listing record, serialized as text.
 *
 * ONE source, TWO consumers, and that is the point:
 *
 *   - lib/knowledge.ts  → the on-site chat assistant's context
 *   - /listings/details → a crawlable page, so an EXTERNAL AI (a GoHighLevel
 *                         knowledge base, a voice agent, any RAG crawler) can
 *                         read the same thing by fetching one URL
 *
 * Why the page exists at all. The consumer-facing listing pages deliberately do
 * not render showing instructions, occupancy, disclosures or price history — a
 * buyer browsing does not need them and some of it reads oddly in a brochure.
 * But those are exactly the fields a caller asks about, so an assistant that can
 * only read the pretty pages cannot answer the phone.
 *
 * The alternative was pasting this into the CRM by hand. That means re-pasting
 * on every price change, every status change, every new listing — so the CRM
 * drifts out of sync with the website within a week and the assistant starts
 * quoting prices that are no longer true. A generated page cannot drift: it is
 * built from content/listings.ts on every deploy.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS PAGE IS PUBLIC. Anything written into these fields can be read by anyone
 * who finds the URL. Never put a lockbox code, a gate code, an alarm code, or a
 * seller's motivation or timeline into `showing.instructions` — say "code
 * provided by the listing agent at booking" instead. Disclosures belong here;
 * negotiating position never does.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  listings,
  formatPrice,
  formatLot,
  STATUS_LABEL,
  type Listing,
} from "@/content/listings";

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

export function listingBrief(l: Listing): string {
  const rows: string[] = [];
  rows.push(
    `### ${l.address}, ${l.city}${l.neighborhood ? ` (${l.neighborhood})` : ""}`
  );
  rows.push(`- Page: /listings/${l.slug}`);
  // Status is a FIELD, not decoration in the heading. Square brackets around it
  // read as an unfilled placeholder to the launch gate, and putting it on its
  // own line is what an assistant scanning for availability wants anyway.
  rows.push(`- Status: ${STATUS_LABEL[l.status]}`);
  if (l.statusDetail) rows.push(`- Status detail: ${l.statusDetail}`);
  rows.push(
    l.status === "sold" && l.soldPrice
      ? `- Sold for ${money(l.soldPrice)} on ${l.soldDate}; asking price had been ${formatPrice(l.price)}`
      : `- Price: ${formatPrice(l.price)}`
  );
  rows.push(
    `- ${l.beds} bed / ${l.baths} full${l.halfBaths ? ` + ${l.halfBaths} half` : ""} bath / ` +
      `${l.sqft.toLocaleString("en-US")} sqft / ${l.stories === 1 ? "single story" : `${l.stories} stories`} / built ${l.yearBuilt}`
  );
  if (l.lotSqft) rows.push(`- Lot: ${formatLot(l.lotSqft)}`);
  if (l.garage) rows.push(`- Garage: ${l.garage} covered spaces`);
  rows.push(`- Property type: ${l.propertyType}`);
  rows.push(
    l.hoa
      ? `- HOA: ${money(l.hoa.fee)} ${l.hoa.frequency}, covering ${l.hoa.includes.join(", ")}.` +
          (l.hoa.rentalRestrictions ? ` Rentals: ${l.hoa.rentalRestrictions}` : "") +
          (l.hoa.ageRestricted ? ` Age restriction: ${l.hoa.ageRestricted}` : "")
      : `- HOA: none`
  );
  if (l.taxes)
    rows.push(
      `- Property tax estimate: ${money(l.taxes.annualEstimate)} per year.` +
        (l.taxes.melloRoos ? ` Mello-Roos: ${l.taxes.melloRoos}` : "")
    );
  if (l.schools)
    rows.push(
      `- School district: ${l.schools.district}. Assignment is per address and must be verified with the district before it is quoted as fact.`
    );
  rows.push(`- Features: ${l.features.join("; ")}`);
  if (l.listedDate)
    rows.push(`- Listed: ${l.listedDate}${l.mlsNumber ? ` (MLS ${l.mlsNumber})` : ""}`);
  if (l.openHouse?.length)
    rows.push(
      `- Open houses: ${l.openHouse.map((o) => `${o.date} ${o.start} to ${o.end}`).join("; ")}`
    );
  if (l.priceHistory?.length)
    rows.push(
      `- Price history: ${l.priceHistory.map((p) => `${p.date} ${money(p.price)} (${p.note})`).join("; ")}`
    );
  if (l.showing)
    rows.push(
      `- Showings: ${l.showing.instructions} Occupancy: ${l.showing.occupancy}.` +
        (l.showing.noticeRequired ? ` Notice: ${l.showing.noticeRequired}.` : "") +
        (l.showing.petOnSite ? ` Pet on site: ${l.showing.petOnSite}` : "")
    );
  if (l.disclosures?.length)
    rows.push(
      `- Known issues already disclosed (say these plainly if asked; do not volunteer a spin): ${l.disclosures.join(" ")}`
    );
  if (l.nearby?.length) rows.push(`- Nearby: ${l.nearby.join(", ")}`);
  rows.push(`- Description: ${l.description.join(" ")}`);
  return rows.join("\n");
}

/** Status key that any assistant reading this needs before it answers availability. */
export const STATUS_KEY =
  `Status meanings: "Coming soon" = not on the MLS yet, private previews possible. ` +
  `"For sale" = available now. "Pending" = in contract; backup offers may still be possible, so check the status detail line. ` +
  `"Sold" = closed. Never offer a sold home for sale or quote its price as current.`;

export function listingsBrief(): string {
  if (!listings.length) return "";
  return (
    `## Listings (the agent's own, not the MLS/IDX search)\n` +
    STATUS_KEY +
    `\n\n` +
    listings.map(listingBrief).join("\n\n")
  );
}
