import { buildCore } from "@/lib/knowledge";

/**
 * /ai-brief — everything the site knows, in one page, for machines.
 *
 * The single URL to point a CRM knowledge base, a voice agent or any retrieval
 * crawler at. Business, team with licences, areas with coordinates, services,
 * and every current listing in full. Regenerated on every deploy, so it cannot
 * drift from the site the way a pasted copy does.
 *
 * A ROUTE HANDLER, DELIBERATELY. See the long note in
 * app/listings/details/route.ts: a page would inherit the root layout, whose
 * footer map contributes several hundred characters of keyboard-shortcut help
 * to the top of the extracted text. On a page this size that noise was a
 * meaningful share of everything the assistant learned. A route handler has no
 * layout at all.
 */
export const dynamic = "force-static";

export async function GET() {
  return new Response(buildCore(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex",
    },
  });
}
