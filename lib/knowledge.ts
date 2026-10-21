/**
 * Site knowledge base for the chat assistant (RAG context).
 *
 * Assembles everything the site actually knows — business + team, areas served
 * (with coordinates), services, listings, the written page content, and blog
 * posts — into one text block the chat passes to Claude. For a marketing site
 * this is small enough to send whole (no vector DB needed), and it's cached at
 * the API so repeat messages are cheap.
 *
 * It reads the SAME source the schema is generated from (config + content), so
 * it already covers the structured facts (geo, services, socials) without
 * parsing JSON-LD.
 *
 * "Functional as soon as there's content": whatever pages/listings/posts exist
 * are included automatically. Empty site = minimal knowledge = it points people
 * to the contact page.
 *
 * Anything still a [BRACKET] placeholder is left out (lib/unfilled.ts). The
 * phone assistant can be connected before launch, and a placeholder read to a
 * caller as a fact is worse than a gap it can admit to.
 */

import { site, areaGeo, agentCredential } from "@/site.config";
import { pageContent } from "@/content/pages";
import { posts } from "@/content/posts";
import { listingsBrief } from "@/lib/listing-brief";
import { geographyBrief } from "@/lib/geography";
import { isUnfilled, filled } from "@/lib/unfilled";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const has = (value: string | undefined) => !isUnfilled(value);

const MAX_CHARS = 32_000; // bound the long-form tail; core facts are never trimmed.
// Raised from 14k once listings carried full detail: eight listings plus the
// business/area/service facts exceed 14k on their own. The block is sent with
// cache_control on every chat call, so a larger stable prefix is cheap after
// the first request — and far cheaper than the assistant denying a real listing.

/**
 * The CORE facts: business, agent, team, areas served, services, and the full
 * listing detail. Curated and non-duplicative.
 *
 * Exported on its own because it is what an EXTERNAL AI should be given. The
 * obvious move — point a crawler at the whole domain — pulls in 253 money pages
 * that are deliberately near-identical (same method, different town). A
 * retrieval index full of those buries the listings: a caller asks about one
 * street and the top matches are eleven variants of the same Antioch page.
 * This block says everything once.
 */
export function buildCore(): string {
  return coreSections().join("\n\n");
}

function coreSections(): string[] {
  const core: string[] = [];
  buildInto(core, []);
  return core;
}

export function buildKnowledge(): string {
  const core: string[] = [];
  const content: string[] = [];
  buildInto(core, content);

  return assemble(core, content);
}

function buildInto(core: string[], content: string[]): void {
  // Business + agent
  const { agent, brand, business, location } = site;
  core.push(
    [
      `## Business`,
      has(brand.logoText)
        ? `Name: ${brand.logoText}${has(business.legalName) ? ` (${business.legalName})` : ""}`
        : "",
      has(agent.name)
        ? `Lead agent: ${filled([agent.name, agentCredential(), agent.brokerage], ", ")}.` +
          (has(agent.license) ? ` License ${agent.license}.` : "")
        : "",
      filled([
        has(agent.phone) ? `Phone: ${agent.phone}.` : "",
        has(agent.email) ? `Email: ${agent.email}.` : "",
      ]),
      has(location.address)
        ? `Office: ${location.address}` +
          (has(location.city) && has(location.state) ? ` (${location.city}, ${location.state}).` : ".")
        : "",
      business.priceRange ? `Price range: ${business.priceRange}.` : "",
      filled(agent.bio),
      `Website contact page: /contact.`,
    ]
      .filter(Boolean)
      .join("\n")
  );

  // Team
  const team = site.team.filter((m) => has(m.name));
  if (team.length) {
    core.push(
      `## Team\n` +
        team
          // Assembled through filled() rather than concatenated, so a member with
          // no phone and no bio yet does not render a dangling "." for the
          // assistant to read out as the end of a sentence.
          .map((m) =>
            filled([
              `- ${m.name}${has(m.title) ? `, ${m.title}` : ""}${has(m.license) ? ` (${m.license})` : ""}.`,
              has(m.phone) ? `${m.phone}.` : "",
              ...m.bio,
            ])
          )
          .join("\n")
    );
  }

  // Areas served (with coordinates from areaGeo — the "schema" geo facts)
  const areas = site.serviceAreas.filter((a) => has(a.name));
  if (areas.length) {
    core.push(
      `## Areas served\n` +
        areas
          .map((a) => {
            const lat = a.lat || areaGeo[a.slug]?.lat;
            const lng = a.lng || areaGeo[a.slug]?.lng;
            const coord = lat && lng ? ` [${lat}, ${lng}]` : "";
            return `- ${a.name}${coord}${has(a.blurb) ? `: ${a.blurb}` : ""} (page: /areas/${a.slug})`;
          })
          .join("\n")
    );
  }

  // Services / niches (with their on-site paths so the assistant links correctly)
  const service = (n: { title: string; slug: string; summary: string }, base: string) =>
    `- ${n.title} (/${base}/${n.slug})${has(n.summary) ? `: ${n.summary}` : ""}`;
  const services = [
    ...site.buyerNiches.filter((n) => has(n.title)).map((n) => service(n, "buyers")),
    ...site.sellerNiches.filter((n) => has(n.title)).map((n) => service(n, "sellers")),
  ];
  if (services.length) core.push(`## Services\n` + services.join("\n"));

  // Where these places are in relation to each other, so the assistant can
  // say "that one is in Discovery Bay, about five miles from Brentwood" rather
  // than matching on words and offering the wrong town.
  const geography = geographyBrief();
  if (geography) core.push(geography);

  // Listings — serialized by lib/listing-brief.ts, which is the SAME function
  // that renders the crawlable /listings/details page. One source, so the
  // on-site assistant and any external AI reading the site cannot disagree.
  const listingText = listingsBrief();
  if (listingText) core.push(listingText);

  // Written page content (real, long-form)
  const pageEntries = Object.entries(pageContent).filter(([, c]) => has(c.h1));
  if (pageEntries.length) {
    content.push(
      `## Site pages\n` +
        pageEntries
          .map(([path, c]) => {
            const body = c.sections.map((s) => `${s.heading}: ${stripHtml(s.html)}`).join(" ");
            const faqs = c.faqs.map((f) => `Q: ${f.q} A: ${f.a}`).join(" ");
            return `### ${c.h1} (${path})\n${body} ${faqs}`;
          })
          .join("\n\n")
    );
  }

  // Blog posts. A post still carrying placeholder text is a scaffold, not
  // something the agent said, so it is left out whole.
  const realPosts = posts.filter(
    (p) => has(p.title) && has(p.excerpt) && !p.sections.some((s) => isUnfilled(s.html))
  );
  if (realPosts.length) {
    content.push(
      `## Blog posts\n` +
        realPosts
          .map((p) => {
            const body = p.sections.map((s) => stripHtml(s.html)).join(" ");
            return `### ${p.title} (${p.city}, /blog/${p.slug})\n${p.excerpt} ${body}`;
          })
          .join("\n\n")
    );
  }

}

function assemble(core: string[], content: string[]): string {
  // Prioritized assembly: the core facts (business, team, areas, services,
  // listings) are ALWAYS kept whole; only the long-form page/post tail is
  // trimmed to fit the budget — so a large site never silently drops its
  // structured facts from the assistant's context.
  const coreText = core.join("\n\n");
  const contentText = content.join("\n\n");
  if (!contentText) return coreText;
  const budget = MAX_CHARS - coreText.length - 2;
  // Core is returned WHOLE even when it alone exceeds the budget. Slicing it
  // here used to silently cut the tail off the listings block — the assistant
  // then denied having listings that plainly exist, which is far more damaging
  // than a longer prompt. If core outgrows the budget, send it anyway.
  if (budget <= 0) return coreText;
  const trimmed =
    contentText.length > budget
      ? contentText.slice(0, budget) +
        "\n…(more detail on individual pages — ask about a specific one)"
      : contentText;
  return `${coreText}\n\n${trimmed}`;
}
