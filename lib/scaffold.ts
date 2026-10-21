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
 * Scaffolds carry "[SCAFFOLD]" markers, so the launch gate always blocks them , a
 * scaffold can never be mistaken for real content or shipped.
 *
 * The body text is deliberately NOT lorem ipsum. Latin renders as a wall of
 * gibberish that reads as a broken site rather than an unfinished one, and an
 * agent seeing it on their own site concludes the product failed. Plain English
 * that says what it is costs nothing, shows the same length, and never gets
 * mistaken for a bug.
 */

import type { PageContent, PageSection } from "@/content/pages";

const LOREM =
  "This section has not been written yet. The real copy goes here, at roughly the length you see on screen, in your voice and about your market. Claude writes it during setup and it is replaced entirely , nothing you are reading now survives onto your live site. ";

/** Approximately `words` worth of honest placeholder text. */
function lorem(words: number): string {
  const base = LOREM.split(" ");
  const out: string[] = [];
  while (out.length < words) out.push(...base);
  return out.slice(0, words).join(" ").replace(/,?$/, ".");
}

type SectionSpec = {
  heading: string;
  words: number;
  guide: string;
  /** Stable anchor, for sections other pages deep-link into. */
  id?: string;
};

function section(spec: SectionSpec): PageSection {
  return {
    heading: spec.heading,
    id: spec.id,
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

/**
 * The six steps of /process. The ids are the deep-link contract shared with
 * components/editorial.tsx PROCESS_STEPS and lib/schema.ts processSchema.
 * Change one, change all three.
 */
function processSpecs(): SectionSpec[] {
  const step = (id: string, name: string, guide: string): SectionSpec => ({
    id,
    heading: `${name}: [the one-line claim this pillar makes]`,
    words: 380,
    guide,
  });
  return [
    {
      id: "overview",
      heading: "The short version",
      words: 240,
      guide:
        "CLIENT REQUIREMENT: this is not a list of steps, it is a position. Open with what most agents do (list it and hope the MLS gets it seen) and what this agent does instead. Name the four pillars. One claim, no hype, no throat-clearing.",
    },
    step("equity", "Equity", "Pricing reframed from 'here are your comps' into a POSITION: where the seller stands in the data market, the negotiation market, and the buyer's mind. The seller should finish this section understanding they are leading the market rather than reacting to it."),
    step("presentation", "Presentation", "Media as perception engineering. Buyers buy a story about a home, and whoever controls the narrative controls the perceived value. Photos, video, copy, and the emotional hook, all decided before anything goes public."),
    step("impact", "Impact", "THE DIFFERENTIATOR. Targeted digital campaigns that put the home in front of thousands who were not searching yet, versus listing and hoping. Be specific about channels and reach. Never write 'maximum exposure'; exposure is a word, reach is a number."),
    step("campaign", "Campaign", "You do not list, you launch. Pre-launch buzz, a timed launch calendar, post-launch follow-up, and offer sequencing. Replaces 'post it and wait' with something that has a plan for every click and every call."),
  ];
}

/**
 * The buying track. Deliberately its OWN skeleton: a buyer does not care how a
 * listing gets marketed, they care what happens to them and in what order.
 *
 * Every brief here carries a verification instruction, because the buying
 * process varies far more by state than selling does. Publishing a generic
 * national version under a licensed agent's name is the failure mode.
 */
function buyingSpecs(ctx: Ctx): SectionSpec[] {
  const step = (id: string, name: string, guide: string): SectionSpec => ({
    id,
    heading: `${name}: [the one-line promise this pillar makes]`,
    words: 340,
    guide: `${guide} CONFIRM WITH THE AGENT how this actually works in ${ctx.city} before writing it.`,
  });
  return [
    {
      id: "overview",
      heading: "The short version",
      words: 240,
      guide:
        "CLIENT REQUIREMENT: most agents start by showing houses. This agent starts by getting the buyer ready to win one. Name the four pillars and say plainly what the buyer walks away with.",
    },
    step("ready", "Ready", "Pre-approved and represented BEFORE touring. The house a buyer loses is usually the one they were not ready to write on. Cover what a lender looks at, and what they sign with the agent and why."),
    step("educated", "Educated", "The honest reality check: what this budget actually buys in this market, before they fall in love with something out of range. This is the section that saves people months."),
    step("aligned", "Aligned", "A search built on real criteria rather than everything on the market. Fewer homes, better ones, and what to look at beyond the photos."),
    step("locked", "Locked", "Offer strategy, negotiation, inspections, financing and closing, run so the ending is boring. VERIFY every state-specific mechanic here."),
  ];
}

/**
 * Privacy and Terms.
 *
 * These are NOT boilerplate to paste. The split that makes them safe:
 *
 *   WE know the technical facts, because we built the site. Exactly which
 *   fields the forms collect, and that submissions reach GoHighLevel, that
 *   hosting is Vercel, that chat messages reach Anthropic, that rate limiting
 *   may use Upstash. Those are verifiable and the same on every site.
 *
 *   THEY know the legal context. Which state and which broker, what their
 *   brokerage requires, how long they retain leads, whether anything beyond
 *   CalOPPA applies to them.
 *
 * So the scaffold states the data flow as fact and marks every jurisdictional
 * question for confirmation. An agent publishing a policy that misdescribes
 * where their clients' data goes is worse off than one with no policy at all.
 */
function legalSpecs(kind: "privacy" | "terms", ctx: Ctx): SectionSpec[] {
  const confirm = "MARK ANY UNCONFIRMED DETAIL AS [PLACEHOLDER: confirm with broker]. Never invent a legal position.";
  if (kind === "privacy") {
    return [
      { id: "what-we-collect", heading: "What this site collects", words: 220,
        guide: `FACTUAL, we built this: contact and funnel forms collect first name, last name, email, optional phone, an optional message, and any extra questions that form asks. Where a phone number is given, whether SMS consent was ticked and the exact wording shown is recorded with a timestamp. Nothing else is collected automatically beyond standard server logs. ${confirm}` },
      { id: "where-it-goes", heading: "Who receives it", words: 240,
        guide: `FACTUAL: submissions are sent to GoHighLevel, the CRM, where the agent manages follow-up. The site is hosted on Vercel. If the chat assistant is switched on, chat messages are processed by Anthropic. Rate limiting may use Upstash. Name each as a service provider processing on the agent's behalf. This is the section most policies get wrong by omission. ${confirm}` },
      { id: "how-it-is-used", heading: "How it is used", words: 180,
        guide: `To respond to the inquiry and to follow up about buying or selling. Say plainly whether the agent sends marketing, and that data is not sold. ${confirm}` },
      { id: "messaging-consent", heading: "Calls and text messages", words: 200,
        guide: `A phone number is only used for texting where consent was given. Say how to stop. TCPA governs consent and A2P 10DLC governs whether carriers deliver at all. ${confirm}` },
      { id: "your-choices", heading: "Your choices", words: 200,
        guide: `How to ask what is held, correct it, or have it deleted, and how to unsubscribe. ${confirm} Do NOT claim CCPA applies: it usually does not for an individual agent. CalOPPA is why this page exists. See .claude/rules/legal-compliance.md section 5.` },
      { id: "contact-us", heading: "How to reach us about this", words: 120,
        guide: `The agent's real name, brokerage, email and phone. This is required, not optional.` },
    ];
  }
  return [
    { id: "who-we-are", heading: "Who runs this site", words: 160,
      guide: `The licensed agent, their licence number, and their brokerage. ${confirm}` },
    { id: "what-this-site-is", heading: "What this site is and is not", words: 220,
      guide: `Information about the agent's services and market. NOT legal, tax, lending or investment advice, and not an offer of representation until an agreement is signed. ${confirm}` },
    { id: "listing-information", heading: "Listing and market information", words: 200,
      guide: `Listing data comes from the MLS or IDX provider, may lag, and is not guaranteed. Any market figure is as-of its date. ${confirm} Include any MLS display rules the provider requires.` },
    { id: "your-use", heading: "Using this site", words: 180,
      guide: `Content belongs to the agent or its licensors. No scraping or republication. Photography may be licensed to the listing brokerage rather than the agent. ${confirm}` },
    { id: "fair-housing", heading: "Fair Housing", words: 140,
      guide: `An Equal Housing Opportunity statement, and that the agent complies with federal and state fair housing law. FACTUAL and required.` },
    { id: "governing", heading: "Governing law and changes", words: 160,
      guide: `[PLACEHOLDER: confirm with broker] which state's law governs and how disputes are handled. This one is genuinely jurisdictional and must not be guessed.` },
  ];
}

export function scaffoldFor(
  pageType: "area-hub" | "money" | "niche" | "home" | "guide" | "process" | "buying" | "privacy" | "terms",
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
  } else if (pageType === "privacy" || pageType === "terms") {
    sections = legalSpecs(pageType, ctx).map(section);
    topic = pageType === "privacy" ? "privacy policy" : "terms of use";
  } else if (pageType === "buying") {
    sections = buyingSpecs(ctx).map(section);
    topic = "how we help you buy";
  } else if (pageType === "process") {
    sections = processSpecs().map(section);
    topic = "how we sell a home";
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
