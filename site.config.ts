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
  /** Wide photo for this specialty's page header. Optional: falls back to the
   *  site-wide business.heroImageUrl, then to a brand gradient. A unique image
   *  per page is the goal; a shared one is fine; an empty band is not. */
  heroImage?: string;
};

export type ServiceArea = {
  /** URL segment. Keep it a slug of `name`. Renaming an area and leaving the
   *  slug behind produces URLs like /areas/neighborhood-one on a finished site;
   *  `npm run launch:check` fails when the two disagree. */
  slug: string;
  name: string;
  blurb: string;
  body: string[];
  /** Map search string. Optional: defaults to "<name>, <city>, <state>", which
   *  is right for a neighborhood. Set it only when the default would be
   *  ambiguous, e.g. a name that exists in several states. */
  mapQuery?: string;
  /** Coordinates for schema geo — the single source of truth. The legacy
   *  top-level `areaGeo` map is a fallback only. */
  lat?: string;
  lng?: string;
  /** Slugs of the 2–3 geographically nearest areas to cross-link. If unset,
   *  cross-linking falls back to declaration order (see `nearbyAreas`). */
  nearby?: string[];
  /** Wide photo for this area's full-bleed page headers. Real local photography
   *  beats stock and it is the agent's own. When unset the site falls back to a
   *  shared brand image rather than showing an empty band. */
  heroImage?: string;
  /**
   * What makes THIS area different from the one next to it.
   *
   * The method of selling a home does not change between neighborhoods, and
   * pretending it does would be dishonest. What changes is the place: who lives
   * there and why, what the housing stock actually is, which schools people ask
   * about, and what somebody gives up or gains by choosing here over next door.
   *
   * These facts are collected ONCE per area during setup and then woven through
   * every page for that area. Without them, twenty pages differ only by the name
   * swapped into the same sentences, which Google reads as one page and ignores
   * the rest.
   *
   * CONFIRMED ONLY. Never invent a school name, a builder, a decade, or a
   * commute time. An empty field costs a little; a wrong one about somebody's
   * own neighborhood costs the agent their credibility with a local reader who
   * knows better.
   */
  localFacts?: {
    /** Housing stock: era, builders, typical lot and layout. */
    homes?: string;
    /** Who chooses this area and what they are choosing it for. */
    whoLivesHere?: string;
    /** Schools people actually ask about. Name them; never rate them. */
    schools?: string;
    /** Getting around: commute, the road everyone uses, what it costs in time. */
    gettingAround?: string;
    /** What is genuinely nearby. Named places, not adjectives. */
    nearby?: string;
    /** The honest trade-off against the neighboring area. */
    tradeOff?: string;
  };
  /** The city this area sits INSIDE, when it is a neighborhood rather than a
   *  city of its own. Setup must ask which one each area is — guessing produces
   *  schema that claims one city contains another, which is factually false and
   *  invisible on the page. Leave unset for a standalone city. */
  parentCity?: string;
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
  /** GHL custom field ID, filled by ghl-integration after provisioning.
   *  VERIFIED against the live API: contact create accepts `id` and SILENTLY
   *  DROPS `key`. Sending fieldKey returns 201 with the values discarded, so the
   *  ID is the only thing that works. */
  ghlFieldId?: string;
  /** Human-readable key (contact.foo). Reference only, never sent. */
  ghlFieldKey?: string;
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
    summary: "[One line: the outcome a buyer gets working with you.]",
    body: ["[Short intro. The content skill writes the full page.]"],
    bullets: ["Personalized home search", "Trusted local lenders", "Expert negotiation", "Support through closing"],
  },
  {
    slug: "first-time-buyers",
    title: "First-Time Buyers",
    menuLabel: "First-Time Buyers",
    summary: "[One line: what a first-time buyer gets that they will not get elsewhere.]",
    body: ["[Short intro for first-time buyers.]"],
    bullets: ["Down-payment and grant guidance", "Step-by-step walkthrough", "Honest advice on every home"],
  },
  {
    slug: "relocation",
    title: "Relocating to the Area",
    menuLabel: "Relocation",
    summary: "[One line: how you help someone moving in from out of the area.]",
    body: ["[Short intro for relocation buyers.]"],
    bullets: ["Neighborhood orientation", "Remote touring options", "Timing a move around a job start"],
  },
  {
    slug: "va-and-military",
    title: "VA and Military Buyers",
    menuLabel: "VA / Military",
    summary: "[One line: how you help a VA buyer or a family on PCS orders.]",
    body: ["VA financing and PCS timelines, handled by someone who has done them before."],
    bullets: ["VA loan basics without the jargon", "PCS timeline pressure", "Working with a lender who knows VA"],
  },
  {
    slug: "move-up-buyers",
    title: "Trading Up",
    menuLabel: "Trading Up",
    summary: "[One line: how you help someone move out of a starter home.]",
    body: ["Moving out of a starter home, with the buy-and-sell sequencing worked out first."],
    bullets: ["Buy first or sell first, decided with your numbers", "Bridge timing", "Two transactions, one plan"],
  },
  {
    slug: "investment-property",
    title: "Investment Property",
    menuLabel: "Investment Property",
    summary: "[One line: what an investor gets from working with you.]",
    body: ["[Short intro for investment buyers.]"],
    bullets: ["Rental demand by neighborhood", "Numbers before emotion", "1031 exchange timelines"],
  },
];

// ---- Seller niches (the "what" for sellers) --------------------------------
const sellerNiches: Niche[] = [
  {
    slug: "selling-your-home",
    title: "Selling Your Home",
    menuLabel: "Selling Your Home",
    summary: "[One line: the outcome a seller gets working with you.]",
    body: ["[Short intro for selling your home.]"],
    bullets: ["Professional photo and video", "Data-driven pricing", "Targeted digital marketing"],
  },
  {
    slug: "downsizing",
    title: "Downsizing",
    menuLabel: "Downsizing",
    summary: "[One line: how you help someone moving to less house.]",
    body: ["[Short intro for downsizing sellers.]"],
    bullets: ["Sequencing the sale and the next home", "What to do with everything", "No-pressure timeline"],
  },
  {
    slug: "divorce-home-sale",
    title: "Selling a Home During Divorce",
    menuLabel: "Divorce Sale",
    summary: "[One line: how you handle a sale where two people must agree.]",
    body: ["[Short intro for divorce sales.]"],
    bullets: ["Neutral, mediator-style handling", "Clear communication to both parties", "Disclosure done properly"],
  },
  {
    slug: "probate-and-trust",
    title: "Probate and Trust Sales",
    menuLabel: "Probate & Trust",
    summary: "[One line: how you help an executor or trustee sell.]",
    body: ["[Short intro for probate and trust sales.]"],
    bullets: ["Court and trustee timelines", "Clearing and preparing the property", "Coordinating with the attorney"],
  },
  {
    slug: "home-valuation",
    title: "What Your Home Is Worth",
    menuLabel: "Home Value",
    summary: "[One line: why your number beats an automated estimate.]",
    body: ["[Short intro for the home valuation offer.]"],
    bullets: ["Free comparative market analysis", "Local pricing trends", "No obligation"],
  },
];

// ---- Service areas (the "where") — one entry per neighborhood/city ----------
const serviceAreas: ServiceArea[] = [
  {
    slug: "neighborhood-one",
    name: "[Neighborhood One]",
    blurb: "[One-line description of this area.]",
    body: ["[Short intro. The content skill writes the full 800-1,200 word page.]"],
    mapQuery: "[Neighborhood One], [ST]",
  },
  {
    slug: "neighborhood-two",
    name: "[Neighborhood Two]",
    blurb: "[One-line description of this area.]",
    body: ["[Short intro.]"],
    mapQuery: "[Neighborhood Two], [ST]",
  },
  {
    slug: "neighborhood-three",
    name: "[Neighborhood Three]",
    blurb: "[One-line description of this area.]",
    body: ["[Short intro.]"],
    mapQuery: "[Neighborhood Three], [ST]",
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
    title: "The [CITY] Home Seller's Guide",
    subtitle: "How to sell your home for top dollar in today's market.",
    bullets: [
      "What your home is really worth right now",
      "Pricing that attracts serious buyers",
      "The marketing that sells homes faster and for more",
    ],
    buttonText: "Send me the guide",
    thankYou: "You're in. Your guide is ready. Read it now, and check your email for a copy.",
  },
  {
    slug: "buyer-guide",
    audience: "buyer",
    title: "The First-Time Buyer's Guide to [CITY]",
    subtitle: "Everything you need to buy your first home with confidence.",
    bullets: [
      "The step-by-step buying process",
      "How much home you can actually afford",
      "Mistakes first-time buyers make (and how to avoid them)",
    ],
    buttonText: "Send me the guide",
    thankYou: "You're in. Your guide is ready. Read it now, and check your email for a copy.",
  },
  // TEST FUNNEL (event goal) — demo content for the funnel-builder/ghl-integration
  // skills. Not a real event; GHL is not wired (seed mode). Replace or remove.
  {
    slug: "vegas-summit",
    goal: "event",
    title: "The Vegas Real Estate Summit",
    subtitle:
      "A free, live, one-day summit for buyers and sellers. Real strategy from local pros, no pitch. Seats are limited, so RSVP to save yours.",
    bullets: [
      "What the market is actually doing right now, and what it means for your move",
      "How to buy or sell with confidence in a shifting market",
      "Live Q&A with the team. Bring your toughest questions",
    ],
    buttonText: "Save my seat",
    thankYou:
      "You're registered! We'll email your confirmation and the venue details. See you at the summit.",
    tag: "funnel-vegas-summit",
    event: {
      format: "In person · Live",
      date: "Saturday, October 17, 2026",
      time: "9:00 AM – 1:00 PM PT",
      location: "The Summit Ballroom, Las Vegas, NV",
    },
    formFields: [
      {
        name: "learningGoal",
        label: "What are you hoping to learn at this event?",
        type: "textarea",
        required: true,
      },
      {
        name: "workingWithAgent",
        label: "Are you already working with an agent?",
        type: "radio",
        options: ["Yes", "No", "I'm an agent myself"],
        required: true,
      },
    ],
  },
];

// ---- The team — one entry per agent (a solo agent has one) ------------------
const team: TeamMember[] = [
  {
    slug: "lead-agent",
    name: "[AGENT NAME]",
    title: "[Realtor / Associate Broker / etc.]",
    isRealtor: false, // set true ONLY if a real NAR member
    license: "[DRE #00000000]",
    phone: "[(555) 123-4567]",
    email: "[agent@example.com]",
    photoUrl: "", // headshot: put the file in public/images/team/ and use /images/team/<slug>.jpg
    bio: [
      "[Short 2-3 sentence bio, first person. Who you serve and the market you know best.]",
      "[Optional proof point: years, homes sold, a specialty.]",
    ],
    lead: true,
  },
  // Add more team members here. Each becomes a /team/[slug] page + Person schema.
];

const lead = team.find((m) => m.lead) ?? team[0];

export const site = {
  // Canonical site URL — used for schema @id anchors and absolute URLs.
  url: "https://[YOURDOMAIN].com",

  // LAUNCH GATE. Stays false until a human has reviewed every field against real,
  // confirmed info. `npm run launch:check` refuses to pass while this is false or
  // while any filler/placeholder remains.
  launchReady: false,

  team,

  // Site-wide identity, derived from the lead agent (no duplication).
  agent: {
    name: lead.name,
    isRealtor: lead.isRealtor,
    credentialLabel: "Real Estate Agent",
    brokerage: "[BROKERAGE NAME]",
    tagline: "Your local guide to buying and selling in [CITY]",
    phone: lead.phone,
    email: lead.email,
    license: lead.license,
    photoUrl: lead.photoUrl,
    bio: [
      "[Short team/brand intro sentence.]",
      "[Second sentence: the market you know and how you work.]",
    ],
  },

  brand: {
    primaryColor: "#1f4e79",
    accentColor: "#c9a24b",
    logoText: "[BUSINESS NAME]",
  },

  // Homepage hero — your first impression. The headline renders in TWO tones:
  // `headlineLead` in your text color and `headlineAccent` in your brand accent,
  //
  // WRITE THIS AS A CLAIM, NOT A GREETING. It is the first thing anybody reads
  // and the last thing most agents think about.
  //
  //   Weak:   "Your trusted [CITY] real estate expert"
  //   Weak:   "The marketing is what sells your house in [CITY]"  (limp opener)
  //   Better: "Marketing is what sells your house in [CITY]"
  //
  // Drop leading articles. "Marketing is what sells your house" lands harder
  // than "The marketing is what sells your house", because the sentence starts
  // on the noun that carries the argument instead of a throat-clear.
  //
  // The accent phrase should be the PLACE or the OUTCOME, since that is the
  // word the eye lands on.
  // so the reader's eye lands on the phrase that matters (usually your city).
  // This is a styled STARTING POINT — rewrite it in your voice. Keep the [CITY]
  // bracket until launch; the gate blocks going live while any bracket remains.
  hero: {
    headlineLead: "Your next move in",
    headlineAccent: "[CITY]",
    subhead:
      "[One punchy sentence: who you help, where, and the result they get. This replaces the generic intro.]",
  },

  location: {
    city: "[CITY]",
    state: "[ST]",
    address: "[123 Main St, City, ST 00000]",
    streetAddress: "[123 Main St]",
    postalCode: "[00000]",
    country: "US",
    // BOTH of these come from the Google BUSINESS PROFILE, not from a plain
    // address search. An address embed drops an anonymous pin on a building; the
    // Business Profile embed shows the business name, rating, and photos, and
    // every interaction with it is credited to the listing Google ranks.
    //
    // To get them: search the business name on Google Maps -> click the business
    // (the card with reviews, NOT a plain address result) -> Share ->
    //   "Embed a map" tab  -> copy the src="..." out of the iframe -> embed URL
    //   "Send a link" tab  -> copy the link                        -> profile URL
    //
    // If the agent has no Business Profile yet, leave BOTH blank and put it on
    // content/OPEN-ITEMS.md. A missing map costs a little; a map that points at
    // an address instead of the business throws away the local-SEO value.
    googleMapsEmbedUrl: "",
    googleBusinessProfileUrl: "",
  },

  // Business facts that power LocalBusiness / RealEstateAgent schema.
  business: {
    legalName: "[LEGAL BUSINESS NAME / LLC]",
    // Images host right here: put files in public/images/brand/ and use these paths.
    /** Wide photo behind the home page and /process headers. Agent data, not
     *  engine: hardcoding it in app/page.tsx meant an engine update wiped it.
     *  Leave empty and the hero falls back to a brand gradient. */
    heroImageUrl: "",
    /** Second wide photo, for the mid-page break. Falls back to heroImageUrl. */
    breakImageUrl: "",
    logoUrl: "", // e.g. /images/brand/logo.png
    imageUrl: "", // e.g. /images/brand/office.jpg
    // Empty on purpose. A seed default here becomes a claim about someone's
    // business that nobody made — it renders into LocalBusiness schema where it
    // is invisible on the page, so it never gets noticed and never gets checked.
    // Fill it only if the agent states it. Empty is dropped from schema entirely.
    priceRange: "",
    foundingYear: "",
    geo: { lat: "", lng: "" },
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
    locationId: "[GHL_LOCATION_ID]",
    calendarEmbedUrl: "",
    chatWidgetSrc: "",
  },

  /**
   * The AI phone assistant's knowledge base.
   *
   * The voice caller does not read this site. It answers from a GoHighLevel
   * knowledge base that has to be built and kept current — the `voice-agent`
   * skill owns that, and this is where the ID it creates gets recorded so every
   * later sync targets the same one.
   *
   * WHY THE ID MATTERS. An account can hold up to fifteen knowledge bases, and
   * an agent will not know which one their caller reads from. Writing listings
   * into the wrong one changes nothing, reports success, and is invisible.
   *
   * The TOKEN is never stored here. It is a Private Integration Token created
   * inside the agent's own sub-account, kept as GHL_API_TOKEN with the other
   * secrets, and it grants write access to their CRM — a config file that ships
   * in a public repo is the last place it belongs.
   */
  voiceAgent: {
    /** Filled by the `voice-agent` skill after it finds or creates the base. */
    knowledgeBaseId: "",
    /** Whether each team member's page also goes into the knowledge base. The
     *  skill asks once during setup and records the answer here; either is fine. */
    includeTeamPages: false,
  },

  // IDX (MLS search). ZERO-friction path: paste the embed URL your IDX provider
  // gives you (IDX Broker, iHomefinder, Showcase IDX, Realtyna, your MLS, etc.).
  // It renders as a full MLS search on /listings. The provider handles MLS
  // compliance. Leave blank to hide it. (This is NOT the same as AI/voice search
  // of the MLS, which is separate — see the listings-manager skill.)
  idx: {
    embedUrl: "",
  },

  listings: {
    /**
     * What the contact block under each listing map offers.
     *
     * "both" is the default and usually right: the buyer who wants to dial and
     * the buyer who will not speak to anyone yet are different people, and
     * showing only one of the two quietly loses the other. Set "phone" for an
     * agent who genuinely only wants calls, or "form" for one who does not want
     * their mobile number on every property page.
     */
    contactCard: "both" as "both" | "phone" | "form",
  },

  social: {
    instagram: "",
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
  "neighborhood-one": { lat: "", lng: "" },
  "neighborhood-two": { lat: "", lng: "" },
  "neighborhood-three": { lat: "", lng: "" },
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

/**
 * Areas that stand on their own: cities, plus anything with no declared parent.
 * A neighborhood declares `parentCity`, so it is reached THROUGH its city rather
 * than sitting beside it. Keeps a twenty-plus item menu readable without hiding
 * anything, and makes the menu hierarchy match the URL hierarchy.
 */
export function topLevelAreas() {
  // An area is top-level when it declares no parent, OR when the parent it
  // declares is not itself one of the service areas.
  //
  // That second case is not theoretical. An agent working three neighborhoods
  // of one city will set parentCity on all three and never add the city as an
  // area, because they do not work the whole city. Filtering on `!parentCity`
  // alone then returns NOTHING and the Areas menu renders completely empty,
  // with no error anywhere. Caught by building a real site rather than reading
  // the code.
  const names = new Set(site.serviceAreas.map((a) => a.name));
  const top = site.serviceAreas.filter(
    (a) => !a.parentCity || !names.has(a.parentCity)
  );
  // Last resort: never hand the menu an empty list.
  return top.length ? top : site.serviceAreas;
}

/** Neighborhoods inside a given area, matched on the area's display name. */
export function childAreas(areaName: string) {
  return site.serviceAreas.filter((a) => a.parentCity === areaName);
}

/** The slug a given name should have. Used by the gate to catch stale slugs. */
export function expectedSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Map search string for an area. Explicit `mapQuery` wins; otherwise built
 *  from the name plus the city and state, which is what a map actually needs. */
export function areaMapQuery(a: { mapQuery?: string; name: string; parentCity?: string }) {
  if (a.mapQuery) return a.mapQuery;
  const city = a.parentCity && a.parentCity !== a.name ? `, ${a.parentCity}` : "";
  return `${a.name}${city}, ${site.location.city}, ${site.location.state}`.replace(
    `, ${site.location.city}, ${site.location.city},`,
    `, ${site.location.city},`
  );
}
