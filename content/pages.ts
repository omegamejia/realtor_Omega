/**
 * Rich, long-form page content (800-1,200+ words), keyed by URL path.
 *
 * SEED STATE: empty. Every area / niche / money page therefore renders its
 * SCAFFOLD (see lib/scaffold.ts) — a full-length, section-by-section brief that
 * shows the agent (and their Claude) exactly what to write and how long.
 *
 * The content skill (.claude/skills/realtor-content-writer) fills entries here,
 * one per page, keyed by the page's URL path. A page with an entry renders the
 * real content; a page without one renders the scaffold. The launch gate blocks
 * any page still on its scaffold.
 *
 * Example of a filled entry:
 *   "/areas/your-city/selling-your-home": {
 *     metaTitle: "Sell Your Home in Your City | Your Business",
 *     metaDescription: "...150-160 chars...",
 *     h1: "Selling Your Home in Your City",
 *     primaryKeyword: "sell your home in your city",
 *     secondaryKeywords: ["...", "..."],
 *     sections: [{ heading: "...", html: "<p>...</p>" }],
 *     ctas: [{ text: "Get My Free Home Value", placement: "primary" }],
 *     faqs: [{ q: "...", a: "..." }],
 *   }
 */

export type PageCTA = { text: string; placement: string };
export type PageSection = {
  heading: string;
  html: string;
  /** Stable anchor. Set this on any section other pages deep-link into, so
   *  rewording the heading never breaks an inbound link. Falls back to a slug
   *  of the heading when unset. */
  id?: string;
};
export type PageFAQ = { q: string; a: string };
export type PageContent = {
  /**
   * WHICH READER THIS PAGE IS FOR, by name, from content/brand-voice.md §1.
   *
   * The launch checklist fails a written page that does not name one. That is
   * deliberate and it is the cheapest possible enforcement of the one rule that
   * keeps copy from going vague: a page addressed to everybody is addressed to
   * nobody, and it reads like it.
   *
   * Write the reader and their awareness level, e.g.
   *   reader: "B, choosing a shop. Level 3."
   */
  reader?: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  sections: PageSection[];
  ctas: PageCTA[];
  faqs: PageFAQ[];
};

export const pageContent: Record<string, PageContent> = {};

export function getPageContent(path: string): PageContent | undefined {
  return pageContent[path];
}
