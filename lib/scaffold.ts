/**
 * SCAFFOLD , the default content for any page that hasn't been written yet.
 *
 * Instead of thin filler, an un-written page renders a FULL-LENGTH scaffold that
 * mirrors the real content model: every section heading, a description of exactly
 * what to write there (purpose + word target + what to include), and lorem to
 * show the true length. This does double duty:
 *   1. The agent sees the real shape and length of the finished page.
 *   2. Their Claude reads the per-section instructions and knows what to write where.
 *
 * Scaffolds contain "lorem ipsum" + "[SCAFFOLD]" markers, so the launch gate
 * always blocks them , a scaffold can never be mistaken for real content or shipped.
 */

import type { PageContent, PageSection } from "@/content/pages";

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. ";

/** Approximately `words` worth of lorem ipsum. */
function lorem(words: number): string {
  const base = LOREM.split(" ");
  const out: string[] = [];
  while (out.length < words) out.push(...base);
  return out.slice(0, words).join(" ").replace(/,?$/, ".");
}

type SectionSpec = { heading: string; words: number; guide: string };

function section(spec: SectionSpec): PageSection {
  return {
    heading: spec.heading,
    html:
      `<p><strong>[SCAFFOLD: replace this section with real content]</strong></p>` +
      `<p><em>What to write here (~${spec.words} words):</em> ${spec.guide}</p>` +
      `<p>${lorem(spec.words)}</p>`,
  };
}

type Ctx = { city: string; niche?: string; audience?: string };

// ---- Section models (from the SEO content model) --------------------------

function areaHubSpecs(c: Ctx): SectionSpec[] {
  return [
    { heading: `Living in ${c.city}`, words: 180, guide: `Overview of ${c.city}. Put the primary keyword ("${c.city} neighborhoods") in the first 100 words. Real local character (named areas/subdivisions, or mark [PLACEHOLDER: verify]). Who the city suits , buyer and seller profile. County/metro context.` },
    { heading: `How [Your Business] Serves ${c.city}`, words: 220, guide: `CLIENT REQUIREMENT: name your business + brokerage and say specifically how your team works THIS city (local tenure, marketing approach, team roles). Use 1-2 verified proof facts. Must be unique to ${c.city} , never swap-and-repeat another city's text.` },
    { heading: `${c.city} Neighborhoods & Communities`, words: 240, guide: `Named subdivisions/communities (or [PLACEHOLDER: verify names]) as descriptive links down to money pages. 2-3 sentences of original commentary per area, not a bare list.` },
    { heading: `${c.city} Housing Market & Home Types`, words: 190, guide: `Housing types (single-family, condo, luxury, etc. where true). Every market number written as [PLACEHOLDER: local stat to verify] , never invent price or days-on-market. Contextualize, don't dump.` },
    { heading: `Neighborhood Tour & Local Lifestyle`, words: 140, guide: `Embed an original ${c.city} tour video ([PLACEHOLDER: video URL]). Commute/transit + amenities framed for one reader. Real local images, not stock.` },
  ];
}

function moneySpecs(c: Ctx): SectionSpec[] {
  const niche = c.niche ?? "this service";
  const aud = c.audience ?? "clients";
  return [
    { heading: `${niche} in ${c.city} , What You Get`, words: 180, guide: `Speak to ONE reader at their decision point. Put the exact primary keyword ("${niche.toLowerCase()} in ${c.city}") in the first 100 words. The specific outcome this ${aud.replace(/s$/, "")} wants. No generic "local expert" filler.` },
    { heading: `Why ${c.city} ${aud} Choose [Your Business]`, words: 230, guide: `CLIENT REQUIREMENT: your business + brokerage + how the team specifically markets/serves ${c.city}. 1-2 verified proof facts. Place trust near the first CTA where objections happen.` },
    { heading: `Our ${niche} Process in ${c.city} , What to Expect`, words: 230, guide: `Step-by-step with timeline expectations and what the client does vs. the team. Marketing steps for sellers. Any market figure as [PLACEHOLDER: local stat].` },
    { heading: `Local Context & Proof for ${c.city}`, words: 190, guide: `Named ${c.city} neighborhoods/subdivisions (or [PLACEHOLDER]). Honest pros/cons. An outcome snapshot or testimonial referencing a practical result. All numbers as [PLACEHOLDER: local stat to verify].` },
  ];
}

function nicheSpecs(c: Ctx): SectionSpec[] {
  const niche = c.niche ?? "this service";
  return [
    { heading: `What ${niche} Means for ${c.audience ?? "Clients"} in Your Market`, words: 200, guide: `Primary keyword in the first 100 words. Plain-language explanation, related synonyms for semantic coverage, and who this is for.` },
    { heading: `How [Your Business] Delivers ${niche}`, words: 210, guide: `Your business + brokerage. Your marketing method concretely. 1-2 verified proof facts. Team roles where relevant.` },
    { heading: `Our Process / What You Get`, words: 200, guide: `Step-by-step or deliverables list, benefit framing. No invented metrics.` },
    { heading: `${niche} Across the Areas We Serve`, words: 140, guide: `Descriptive keyword-rich links down to 4-6 area × niche money pages. Your metro/county entity anchors.` },
  ];
}

function guideSpecs(c: Ctx): SectionSpec[] {
  const aud = c.audience ?? "clients";
  const one = aud.replace(/s$/, "");
  return [
    { heading: `Who This Guide Is For`, words: 160, guide: `Speak to ONE ${one} in ${c.city} at the start of their journey. Name the outcome they want and what this guide delivers. Primary keyword in the first 100 words. No fluff , earn the opt-in by being specific.` },
    { heading: `The [City] ${aud === "sellers" ? "Selling" : "Buying"} Process, Step by Step`, words: 300, guide: `The core value. Walk the real steps in ${c.city}, in order, with what happens at each and what the ${one} needs to do. Any market figure as [PLACEHOLDER: local stat to verify] , never invent numbers.` },
    { heading: `Mistakes to Avoid`, words: 220, guide: `3-5 specific, local mistakes ${aud} make and how to avoid each. Concrete and honest , this is what makes the guide worth their email.` },
    { heading: `How [Your Business] Helps , and Your Next Step`, words: 160, guide: `Name your business + brokerage and how you specifically help ${c.city} ${aud}. 1-2 verified proof facts. End with ONE clear next step (book a call / contact) , this guide is the top of the funnel.` },
  ];
}

function homeSpecs(): SectionSpec[] {
  return [
    { heading: `Who We Are`, words: 150, guide: `Name your business + brokerage and the lead agent. 1-2 verified proof facts. Digital-first / marketing positioning. No invented stats.` },
    { heading: `Areas We Serve`, words: 150, guide: `Name every area once as a descriptive link to its area hub. County/metro as the entity anchor. One line on your home base.` },
    { heading: `How We Market Homes`, words: 170, guide: `Your marketing edge framed as a benefit to the client. Link to the relevant niche pillar. Benefit framing, not a feature dump.` },
    { heading: `Proof: Results You Can Point To`, words: 140, guide: `1-2 verified outcome facts. A real testimonial (not generic praise). [PLACEHOLDER: review count/rating to verify]. Keep NAP consistent.` },
    { heading: `Start Here , Buyer or Seller`, words: 100, guide: `Repeat both primary CTAs and the phone. One line telling the reader exactly what happens next.` },
  ];
}

function scaffoldFaqs(topic: string): { q: string; a: string }[] {
  return [
    { q: `[FAQ 1 , a real question a ${topic} client asks]`, a: `[Direct answer in the first sentence (~40-60 words). Use verified facts only; any number as [PLACEHOLDER].]` },
    { q: `[FAQ 2 , question specific to ${topic}]`, a: `[Direct answer first. Then one supporting sentence.]` },
    { q: `[FAQ 3 , objection-handling question]`, a: `[Direct answer that removes the doubt, in the brand voice.]` },
  ];
}

const CTAS = [
  { text: "Get My Free Home Value", placement: "primary" },
  { text: "Book a Call", placement: "secondary" },
];

// ---- Public builder --------------------------------------------------------

export function scaffoldFor(
  pageType: "area-hub" | "money" | "niche" | "home" | "guide",
  ctx: Ctx
): PageContent {
  let sections: PageSection[];
  let topic: string;
  if (pageType === "area-hub") {
    sections = areaHubSpecs(ctx).map(section);
    topic = `${ctx.city} real estate`;
  } else if (pageType === "money") {
    sections = moneySpecs(ctx).map(section);
    topic = `${ctx.niche} in ${ctx.city}`;
  } else if (pageType === "home") {
    sections = homeSpecs().map(section);
    topic = `${ctx.city} real estate`;
  } else if (pageType === "guide") {
    sections = guideSpecs(ctx).map(section);
    topic = ctx.niche ?? `${ctx.city} real estate guide`;
  } else {
    sections = nicheSpecs(ctx).map(section);
    topic = ctx.niche ?? "this service";
  }

  return {
    metaTitle: `[SCAFFOLD] ${topic}`,
    metaDescription: `[SCAFFOLD meta description , 150-160 chars, primary keyword in first 120.]`,
    h1: `[SCAFFOLD] ${topic}`,
    primaryKeyword: topic,
    secondaryKeywords: [],
    sections,
    ctas: CTAS,
    faqs: scaffoldFaqs(topic),
  };
}
