/**
 * ============================================================================
 *  SITE CONFIG — the ONE file that customizes this whole site per agent.
 * ============================================================================
 *
 *  This is the SEED. Everything in [SQUARE BRACKETS] is a placeholder for the
 *  setup skill (or you + Claude) to fill in. Nothing launches while placeholders
 *  remain — `npm run launch:check` blocks it.
 *
 *  Fill this file + write content, and the whole site (nav, pages, schema, maps,
 *  interlinking) follows automatically. See README.md and the skills in
 *  .claude/skills/.
 */

export type Niche = {
  slug: string;
  title: string;
  menuLabel: string;
  summary: string;
  body: string[];
  bullets: string[];
};

export type ServiceArea = {
  slug: string;
  name: string;
  blurb: string;
  body: string[];
  mapQuery: string;
  /** Coordinates for schema geo — the single source of truth. The legacy
   *  top-level `areaGeo` map is a fallback only. */
  lat?: string;
  lng?: string;
  /** Slugs of the 2–3 geographically nearest areas to cross-link. If unset,
   *  cross-linking falls back to declaration order (see `nearbyAreas`). */
  nearby?: string[];
};

export type TeamMember = {
  slug: string;
  name: string;
  title: string;
  isRealtor: boolean;
  license: string;
  phone: string;
  email: string;
  photoUrl: string;
  bio: string[];
  lead?: boolean;
};

// A single extra question on a funnel form (beyond name/email/phone). Each one
// becomes a GHL custom field, wired by the ghl-integration skill. Until GHL is
// wired, the answer is still captured (seed-mode logs it).
export type FunnelField = {
  name: string; // form input name + seed-mode key (camelCase)
  label: string;
  type: "text" | "textarea" | "select" | "radio";
  options?: string[]; // for select / radio
  required?: boolean;
  ghlFieldKey?: string; // filled by ghl-integration once the GHL field exists
};

export type Funnel = {
  slug: string;
  goal?: "magnet" | "event"; // default "magnet" (a lead-magnet guide funnel)
  audience?: "buyer" | "seller"; // magnet funnels only
  title: string; // the offer name/headline
  subtitle: string;
  bullets: string[]; // what they get / why attend
  buttonText: string;
  thankYou: string;
  tag?: string; // GHL nurture/delivery tag; defaults to funnel-<slug>
  // Event funnels (goal: "event") show these details and skip the guide page.
  // Real events use CONFIRMED details only — never fabricate for a live site.
  event?: { format: string; date: string; time: string; location: string };
  // Extra questions → GHL custom fields (see ghl-integration).
  formFields?: FunnelField[];
  // A magnet funnel's guide is a real page at /free/<slug>/guide (written via the
  // funnel-builder skill into content/pages.ts), gate-checked like every page.
};

// ---- Buyer niches (the "what" for buyers) ----------------------------------
// RULE: at least FIVE specialty niches across buyers + sellers, on top of the
// two generic ones. Plain "buying" and "selling" rank for nothing; the
// specialties are what people actually search. Keep only what the agent really
// does and swap in others from content-model.md. Never invent a specialty.
const buyerNiches: Niche[] = [
  {
    slug: "buying-a-home",
    title: "Buying a Home",
    menuLabel: "Buying a Home",
    summary: "Knowing which houses to skip is most of the job. That is where we start.",
    body: ["A clear path from first showing to closing, with honest reads along the way."],
    bullets: ["Personalized home search", "Trusted local lenders", "Expert negotiation", "Support through closing"],
  },
  {
    slug: "first-time-buyers",
    title: "First-Time Buyers",
    menuLabel: "First-Time Buyers",
    summary: "Every step explained before you take it, and nobody rushing you through it.",
    body: ["Buying your first home in Brentwood, explained before you have to decide anything."],
    bullets: ["Down-payment and grant guidance", "Step-by-step walkthrough", "Honest advice on every home"],
  },
  {
    slug: "relocation",
    title: "Relocating to the Area",
    menuLabel: "Relocation",
    summary: "Moving here from somewhere else, without having to guess which street is right.",
    body: ["Landing in Brentwood from somewhere else, without guessing which street is right."],
    bullets: ["Neighborhood orientation", "Remote touring options", "Timing a move around a job start"],
  },
  {
    slug: "investment-property",
    title: "Investment Property",
    menuLabel: "Investment Property",
    summary: "Numbers before feelings. What the rent actually supports, street by street.",
    body: ["What Brentwood rentals actually support, assessed street by street."],
    bullets: ["Rental demand by neighborhood", "Numbers before emotion", "1031 exchange timelines"],
  },
];

// ---- Seller niches (the "what" for sellers) --------------------------------
const sellerNiches: Niche[] = [
  {
    slug: "selling-your-home",
    title: "Selling Your Home",
    menuLabel: "Selling Your Home",
    summary: "Prepared, priced against your street, and marketed properly. In that order.",
    body: ["Preparation, pricing, then marketing. In that order, because the order is the job."],
    bullets: ["Professional photo and video", "Data-driven pricing", "Targeted digital marketing"],
  },
  {
    slug: "downsizing",
    title: "Downsizing",
    menuLabel: "Downsizing",
    summary: "Less house, more life, and a plan for the part everyone dreads.",
    body: ["Moving to less house, with a plan for the part everyone dreads."],
    bullets: ["Sequencing the sale and the next home", "What to do with everything", "No-pressure timeline"],
  },
  {
    slug: "divorce-home-sale",
    title: "Selling a Home During Divorce",
    menuLabel: "Divorce Sale",
    summary: "Two owners, one deadline. Handled like a mediator, not a salesperson.",
    body: ["Selling when two people must agree, handled without taking a side."],
    bullets: ["Neutral, mediator-style handling", "Clear communication to both parties", "Disclosure done properly"],
  },
  {
    slug: "probate-and-trust",
    title: "Probate and Trust Sales",
    menuLabel: "Probate & Trust",
    summary: "Selling an inherited home, with the timelines and the paperwork handled.",
    body: ["Selling an inherited Brentwood home, with the timelines handled properly."],
    bullets: ["Court and trustee timelines", "Clearing and preparing the property", "Coordinating with the attorney"],
  },
  {
    slug: "home-valuation",
    title: "What Your Home Is Worth",
    menuLabel: "Home Value",
    summary: "A real number from someone who stood in the house. Not an automated guess.",
    body: ["A number that comes from standing in the house, not from public records."],
    bullets: ["Free comparative market analysis", "Local pricing trends", "No obligation"],
  },
];

// ---- Service areas (the "where") — one entry per neighborhood/city ----------
const serviceAreas: ServiceArea[] = [
  {
    slug: "brentwood",
    name: "Brentwood",
    blurb: "Orchards on the edges, newer neighborhoods through the middle, and a downtown you can walk.",
    body: ["Brentwood sits at the eastern edge of Contra Costa County, where the Bay Area runs out."],
    mapQuery: "Brentwood, CA",
    lat: "37.9319",
    lng: "-121.6958",
  },
];

// ---- Funnels / lead magnets — opt-in pages at /free/[slug] --------------------
// Each funnel is a distraction-light landing page offering a free guide. The form
// captures the lead into GoHighLevel (tagged with the funnel slug for nurture),
// then sends them to the guide at /free/<slug>/guide. Write the guide via the
// funnel-builder skill (it's a real page in content/pages.ts, gate-checked).
const funnels: Funnel[] = [
  {
    slug: "seller-guide",
    audience: "seller",
    title: "What Your Brentwood Home Is Actually Worth",
    subtitle: "A short guide to pricing, preparing, and knowing when not to sell yet.",
    bullets: [
      "Why the online estimate is wrong about your house",
      "The repairs that pay you back, and the ones that never do",
      "How to tell whether now is your moment",
    ],
    buttonText: "Send me the guide",
    thankYou: "You are in. Read it now, and check your email for a copy.",
  },
];

// ---- The team — one entry per agent (a solo agent has one) ------------------
const team: TeamMember[] = [
  {
    slug: "krista-mashore",
    name: "Krista Mashore",
    title: "Realtor and Associate Broker",
    isRealtor: true,
    license: "DRE 01346304",
    phone: "(925) 400-1104",
    email: "krista@kristahomes.com",
    photoUrl: "",
    bio: [
      "I have sold homes in East Contra Costa for more than two decades. I still walk every listing before it is priced.",
      "Think of me as a mediator more than a salesperson. When a decision is emotional, my job is to keep it from getting expensive.",
    ],
    lead: true,
  },
];

const lead = team.find((m) => m.lead) ?? team[0];

export const site = {
  // Canonical site URL — used for schema @id anchors and absolute URLs.
  url: "https://kristahomes.com",

  // LAUNCH GATE. Stays false until a human has reviewed every field against real,
  // confirmed info. `npm run launch:check` refuses to pass while this is false or
  // while any filler/placeholder remains.
  launchReady: true,

  team,

  // Site-wide identity, derived from the lead agent (no duplication).
  agent: {
    name: lead.name,
    isRealtor: lead.isRealtor,
    credentialLabel: "Real Estate Agent",
    brokerage: "The Mashore Group",
    tagline: "When you do what you love, people love what you do",
    phone: lead.phone,
    email: lead.email,
    license: lead.license,
    photoUrl: lead.photoUrl,
    bio: [
      "The Mashore Group sells homes in Brentwood and East Contra Costa County.",
      "Most of our work arrives by referral, so the advice has to hold up long after closing.",
    ],
  },

  brand: {
    primaryColor: "#111114",
    accentColor: "#c9a24b",
    logoText: "The Mashore Group",
  },

  // Homepage hero — your first impression. The headline renders in TWO tones:
  // `headlineLead` in your text color and `headlineAccent` in your brand accent,
  // so the reader's eye lands on the phrase that matters (usually your city).
  // This is a styled STARTING POINT — rewrite it in your voice. Keep the [CITY]
  // bracket until launch; the gate blocks going live while any bracket remains.
  hero: {
    headlineLead: "Your next move in",
    headlineAccent: "Brentwood",
    subhead:
      "I help Brentwood families move without getting taken advantage of at the worst possible moment.",
  },

  location: {
    city: "Brentwood",
    state: "CA",
    address: "120 Oak Street, Brentwood, CA 94513",
    streetAddress: "120 Oak Street",
    postalCode: "94513",
    country: "US",
    // Google Maps -> Share -> "Embed a map", or:
    //   https://www.google.com/maps?q=<url-encoded address>&output=embed
    googleMapsEmbedUrl: "https://www.google.com/maps?q=120%20Oak%20Street%2C%20Brentwood%2C%20CA%2094513&output=embed",
    googleBusinessProfileUrl: "",
  },

  // Business facts that power LocalBusiness / RealEstateAgent schema.
  business: {
    legalName: "The Mashore Group",
    // Images host right here: put files in public/images/brand/ and use these paths.
    logoUrl: "", // e.g. /images/brand/logo.png
    imageUrl: "", // e.g. /images/brand/office.jpg
    priceRange: "$$",
    foundingYear: "2004",
    geo: { lat: "37.9319", lng: "-121.6958" },
    hours: [] as { days: string[]; opens: string; closes: string }[],
    // Never fabricate reviews. Fill ONLY from a real rating source.
    reviews: { ratingValue: "", reviewCount: "" },
  },

  buyerNiches,
  sellerNiches,
  serviceAreas,
  funnels,

  // GoHighLevel (CRM only). Optional — the contact form posts here if set.
  ghl: {
    locationId: "",
    calendarEmbedUrl: "",
    chatWidgetSrc: "",
  },

  // IDX (MLS search). ZERO-friction path: paste the embed URL your IDX provider
  // gives you (IDX Broker, iHomefinder, Showcase IDX, Realtyna, your MLS, etc.).
  // It renders as a full MLS search on /listings. The provider handles MLS
  // compliance. Leave blank to hide it. (This is NOT the same as AI/voice search
  // of the MLS, which is separate — see the listings-manager skill.)
  idx: {
    embedUrl: "",
  },

  social: {
    instagram: "https://www.instagram.com/kristamashore",
    facebook: "",
    youtube: "",
    linkedin: "",
    tiktok: "",
  },
};

export type SiteConfig = typeof site;

// ---- Helpers ---------------------------------------------------------------
export const allNiches: Niche[] = [...buyerNiches, ...sellerNiches];

export function getNiche(slug: string): Niche | undefined {
  return allNiches.find((n) => n.slug === slug);
}

export function getArea(slug: string): ServiceArea | undefined {
  return serviceAreas.find((a) => a.slug === slug);
}

export function getTeamMember(slug: string): TeamMember | undefined {
  return team.find((m) => m.slug === slug);
}

export function getFunnel(slug: string): Funnel | undefined {
  return funnels.find((f) => f.slug === slug);
}

/**
 * Public city-center coordinates for each served area (real geographic data).
 * Fed into schema `geo` on areaServed Places and area pages. Add one entry per
 * serviceArea slug. Leave blank to omit geo for that area.
 */
/**
 * Cross-links the areas nearest to `area`: its declared `nearby` slugs when set,
 * otherwise the first 3 other areas in declaration order. Set `nearby` on a
 * ServiceArea to control true adjacency instead of relying on array position.
 */
export function nearbyAreas(area: ServiceArea): ServiceArea[] {
  if (area.nearby?.length) {
    return area.nearby
      .map((slug) => site.serviceAreas.find((a) => a.slug === slug))
      .filter((a): a is ServiceArea => Boolean(a));
  }
  return site.serviceAreas.filter((a) => a.slug !== area.slug).slice(0, 3);
}

// DEPRECATED fallback — put `lat`/`lng` directly on each ServiceArea instead
// (single source of truth). Kept so any existing entries keep resolving.
export const areaGeo: Record<string, { lat: string; lng: string }> = {
  brentwood: { lat: "37.9319", lng: "-121.6958" },
};

export function isSellerNiche(slug: string): boolean {
  return sellerNiches.some((n) => n.slug === slug);
}

export function agentCredential(): string {
  return site.agent.isRealtor ? "REALTOR®" : site.agent.credentialLabel;
}

/** Non-empty social URLs — feeds schema `sameAs`. */
export function sameAs(): string[] {
  return Object.values(site.social).filter((v) => typeof v === "string" && v.length > 0);
}

/** Absolute URL for a path, based on site.url. */
export function absoluteUrl(path: string): string {
  const base = site.url.replace(/\/$/, "");
  return path === "/" ? `${base}/` : `${base}${path}`;
}
