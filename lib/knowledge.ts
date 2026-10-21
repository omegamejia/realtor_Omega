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
 */

import { site, areaGeo, agentCredential } from "@/site.config";
import { pageContent } from "@/content/pages";
import { posts } from "@/content/posts";
import { listings, formatPrice } from "@/content/listings";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MAX_CHARS = 14_000; // bound the context to control tokens

export function buildKnowledge(): string {
  const core: string[] = [];
  const content: string[] = [];

  // Business + agent
  core.push(
    [
      `## Business`,
      `Name: ${site.brand.logoText} (${site.business.legalName})`,
      `Lead agent: ${site.agent.name}, ${agentCredential()}, ${site.agent.brokerage}. License ${site.agent.license}.`,
      `Phone: ${site.agent.phone}. Email: ${site.agent.email}.`,
      `Office: ${site.location.address} (${site.location.city}, ${site.location.state}).`,
      site.business.priceRange ? `Price range: ${site.business.priceRange}.` : "",
      site.agent.bio.join(" "),
      `Website contact page: /contact.`,
    ]
      .filter(Boolean)
      .join("\n")
  );

  // Team
  if (site.team.length) {
    core.push(
      `## Team\n` +
        site.team
          .map(
            (m) =>
              `- ${m.name}, ${m.title}${m.license ? ` (${m.license})` : ""}. ${m.phone}. ${m.bio.join(" ")}`
          )
          .join("\n")
    );
  }

  // Areas served (with coordinates from areaGeo — the "schema" geo facts)
  core.push(
    `## Areas served\n` +
      site.serviceAreas
        .map((a) => {
          const lat = a.lat || areaGeo[a.slug]?.lat;
          const lng = a.lng || areaGeo[a.slug]?.lng;
          const coord = lat && lng ? ` [${lat}, ${lng}]` : "";
          return `- ${a.name}${coord}: ${a.blurb} (page: /areas/${a.slug})`;
        })
        .join("\n")
  );

  // Services / niches (with their on-site paths so the assistant links correctly)
  core.push(
    `## Services\n` +
      site.buyerNiches
        .map((n) => `- ${n.title} (/buyers/${n.slug}): ${n.summary}`)
        .join("\n") +
      "\n" +
      site.sellerNiches
        .map((n) => `- ${n.title} (/sellers/${n.slug}): ${n.summary}`)
        .join("\n")
  );

  // Listings
  if (listings.length) {
    core.push(
      `## Current listings\n` +
        listings
          .map(
            (l) =>
              `- ${l.address}, ${l.city} — ${formatPrice(l.price)}, ${l.status}, ${l.beds} bd / ${l.baths} ba / ${l.sqft} sqft. ${l.description.join(" ")} (page: /listings/${l.slug})`
          )
          .join("\n")
    );
  }

  // Written page content (real, long-form)
  const pageEntries = Object.entries(pageContent);
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

  // Blog posts
  if (posts.length) {
    content.push(
      `## Blog posts\n` +
        posts
          .map((p) => {
            const body = p.sections.map((s) => stripHtml(s.html)).join(" ");
            return `### ${p.title} (${p.city}, /blog/${p.slug})\n${p.excerpt} ${body}`;
          })
          .join("\n\n")
    );
  }

  // Prioritized assembly: the core facts (business, team, areas, services,
  // listings) are ALWAYS kept whole; only the long-form page/post tail is
  // trimmed to fit the budget — so a large site never silently drops its
  // structured facts from the assistant's context.
  const coreText = core.join("\n\n");
  const contentText = content.join("\n\n");
  if (!contentText) return coreText;
  const budget = MAX_CHARS - coreText.length - 2;
  if (budget <= 0) return coreText.slice(0, MAX_CHARS);
  const trimmed =
    contentText.length > budget
      ? contentText.slice(0, budget) +
        "\n…(more detail on individual pages — ask about a specific one)"
      : contentText;
  return `${coreText}\n\n${trimmed}`;
}
