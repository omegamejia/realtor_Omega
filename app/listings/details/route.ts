import { listings } from "@/content/listings";
import { listingsBrief } from "@/lib/listing-brief";
import { site } from "@/site.config";

/**
 * /listings/details — every listing in full, for machines.
 *
 * WHY THIS IS A ROUTE HANDLER AND NOT A PAGE, which looks like a downgrade and
 * is the entire point:
 *
 * A page goes through the root layout, which renders the nav, the chat widget
 * and the footer. The footer contains a Google Map embed, and that embed ships
 * its own keyboard-shortcut help as visible text:
 *
 *     "Maps ← Move left → Move right ↑ Move up ↓ Move down + Zoom in - Zoom out
 *      Home Jump left by 75% … Sorry, we have no imagery here … BESbswy"
 *
 * A crawler extracts text, so that block became the OPENING 504 CHARACTERS of
 * every crawled page on a live agent's site. Measured, not guessed: on one
 * listing page it was 504 of 2,310 characters, and on the machine-readable feed
 * it was most of the content. The page whose only job is to hand an assistant
 * every listing was being indexed largely as map controls.
 *
 * A route handler bypasses layouts completely. No nav, no footer, no map, no
 * chat widget. Text in, text out.
 *
 * Everything here is public — see the warning in lib/listing-brief.ts about what
 * must never be written into showing instructions.
 */
export const dynamic = "force-static";

export async function GET() {
  const body =
    listings.length === 0
      ? `There are no current listings from ${site.brand.logoText} right now.`
      : listingsBrief();

  return new Response(body, {
    headers: {
      // text/plain so nothing has to strip markup to read it, and so no
      // extractor can mistake styling for content.
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex",
    },
  });
}
