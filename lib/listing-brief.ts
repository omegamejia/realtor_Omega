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

import { site } from "@/site.config";
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

/**
 * The ROLL CALL, and it is the most important paragraph on the site.
 *
 * A knowledge base is a similarity search, not a database. It finds passages
 * that RESEMBLE the question and cannot enumerate anything. So "what listings do
 * you have" only works if some passage somewhere already looks like the answer
 * to that question, written in the words a caller actually uses.
 *
 * This was a real failure. An agent's voice assistant answered a question about
 * a specific address perfectly, and then denied having any listings at all when
 * asked what was available — because "1092 Riverbend Drive" strongly resembles a
 * passage containing that address, and "what have you got" resembles nothing.
 * The inventory was fully indexed. Nothing matched the question.
 *
 * Hence the phrasing below. "Homes for sale in <city>", "current listings",
 * "available now", the count, then every address in one run. It reads like the
 * answer to the question people ask, so the search can find it.
 */
export function listingsRollCall(): string {
  if (!listings.length) {
    return `There are no current listings from ${site.brand.logoText} right now.`;
  }
  const forSale = listings.filter((l) => l.status !== "sold");
  const cities = [...new Set(forSale.map((l) => l.city))];
  const where = cities.length === 1 ? cities[0] : cities.join(", ");

  return [
    `# Current listings from ${site.brand.logoText}`,
    ``,
    `Homes for sale in ${where}. These are the current listings, the available ` +
      `properties, and the homes on the market right now with ` +
      `${site.brand.logoText}.`,
    ``,
    `There are ${forSale.length} available ${
      forSale.length === 1 ? "property" : "properties"
    } right now${cities.length ? ` in ${where}` : ""}.`,
    ``,
    `The full list of addresses:`,
    ...forSale.map(
      (l) =>
        `- ${l.address}, ${l.city} — ${formatPrice(l.price)} — ${
          STATUS_LABEL[l.status]
        }`
    ),
    ``,
    `Full detail for each of these follows below.`,
  ].join("\n");
}

export function listingsBrief(): string {
  if (!listings.length) return "";
  return (
    listingsRollCall() +
    `\n\n## Listings (the agent's own, not the MLS/IDX search)\n` +
    STATUS_KEY +
    `\n\n` +
    listings.map(listingBrief).join("\n\n")
  );
}
