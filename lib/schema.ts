/**
 * ============================================================================
 *  SCHEMA ENGINE — JSON-LD structured data, generated from site.config.
 * ============================================================================
 *
 *  Design principles:
 *   - ONE connected graph per page (@graph) with @id cross-references, not a
 *     pile of disconnected blobs. Google merges nodes by @id into a knowledge
 *     graph — that's what "the best it can be" means.
 *   - The base entities (Organization, WebSite, the RealEstateAgent
 *     LocalBusiness, the agent Person) are emitted on EVERY page by the layout.
 *   - Each page adds only its page-specific nodes (WebPage, BreadcrumbList,
 *     Service, Place, BlogPosting…), referencing the base nodes by @id.
 *   - Empty/optional fields are OMITTED, never emitted blank. A blank or faked
 *     property is worse than an absent one.
 *
 *  Nobody hand-writes JSON-LD. Data goes in the config; correct schema comes
 *  out here; the validator (scripts/validate-schema.mjs) gates every build.
 */

import {
  site,
  agentCredential,
  sameAs,
  absoluteUrl,
  areaGeo,
  type Niche,
  type ServiceArea,
  type TeamMember,
} from "@/site.config";
import { hasRealGeo } from "@/lib/listings";

type Node = Record<string, unknown>;

// ---- Stable @id anchors ----------------------------------------------------
const ID = {
  organization: absoluteUrl("/#organization"),
  website: absoluteUrl("/#website"),
  localBusiness: absoluteUrl("/#localbusiness"),
};

/** Stable @id for a team member's Person node. */
function personId(slug: string): string {
  return absoluteUrl(`/#person-${slug}`);
}

const leadMember = site.team.find((m) => m.lead) ?? site.team[0];
const LEAD_PERSON_ID = personId(leadMember.slug);

/** Drop keys whose value is empty ("" / null / undefined / empty object). */
function clean<T extends Node>(node: T): T {
  const out: Node = {};
  for (const [k, v] of Object.entries(node)) {
    if (v === "" || v === null || v === undefined) continue;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v as Node).length === 0)
      continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as T;
}

function postalAddress(): Node | undefined {
  const a = clean({
    "@type": "PostalAddress",
    streetAddress: site.location.streetAddress,
    addressLocality: site.location.city,
    addressRegion: site.location.state,
    postalCode: site.location.postalCode,
    addressCountry: site.location.country,
  });
  // Require at least a locality to be meaningful.
  return Object.keys(a).length > 1 ? a : undefined;
}

function geo(): Node | undefined {
  const { lat, lng } = site.business.geo;
  if (!lat || !lng) return undefined;
  return { "@type": "GeoCoordinates", latitude: lat, longitude: lng };
}

function openingHours(): Node[] | undefined {
  if (!site.business.hours?.length) return undefined;
  return site.business.hours.map((h) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: h.days,
    opens: h.opens,
    closes: h.closes,
  }));
}

function aggregateRating(): Node | undefined {
  const { ratingValue, reviewCount } = site.business.reviews;
  if (!ratingValue || !reviewCount) return undefined;
  return {
    "@type": "AggregateRating",
    ratingValue,
    reviewCount,
  };
}

/** GeoCoordinates node for a served area, or undefined if unknown. */
function geoFor(area: {
  slug: string;
  lat?: string;
  lng?: string;
}): Node | undefined {
  const lat = area.lat || areaGeo[area.slug]?.lat;
  const lng = area.lng || areaGeo[area.slug]?.lng;
  if (!lat || !lng) return undefined;
  return { "@type": "GeoCoordinates", latitude: lat, longitude: lng };
}

function areaServed(): Node[] {
  return site.serviceAreas.map((a) =>
    clean({
      "@type": "Place",
      name: `${a.name}, ${site.location.state}`,
      geo: geoFor(a),
      // A neighborhood states the city it belongs to; a city states nothing.
      // Never infer this from the office location — that asserts one city
      // contains another, which is both false and unnoticeable on the page.
      containedInPlace: a.parentCity
        ? { "@type": "City", name: `${a.parentCity}, ${site.location.state}` }
        : undefined,
    })
  );
}

// ---- Base nodes (emitted on every page via the layout) --------------------

/**
 * The BUSINESS, not the person.
 *
 * This used to emit `site.agent.name`, which told Google the organization was
 * called "Dana Whitfield" while the header said "Whitfield Realty". That is the
 * wrong entity in the knowledge graph, it fails to match the Google Business
 * Profile, and because schema never appears on screen no human would ever catch
 * it. The person is a separate Person node, linked as an employee.
 *
 * Falls back to the agent's name only when no business name is set, which is the
 * honest answer for a solo agent trading under their own name.
 */
/**
 * Schema requires ABSOLUTE urls for images. A relative path like
 * "/images/brand/logo.png" is silently ignored by Google, so a site can ship a
 * perfectly good logo and three real headshots that no search engine ever sees.
 * Nothing fails, nothing warns; the images are simply not there as far as the
 * knowledge graph is concerned.
 *
 * Passes through anything already absolute, and returns undefined for empty so
 * `clean()` drops the field rather than emitting a bare origin.
 */
function absoluteImage(src?: string): string | undefined {
  if (!src) return undefined;
  return /^https?:\/\//i.test(src) ? src : absoluteUrl(src);
}

function businessName(): string {
  return site.brand.logoText || site.business.legalName || site.agent.name;
}

function organizationNode(): Node {
  return clean({
    "@type": "Organization",
    "@id": ID.organization,
    name: businessName(),
    legalName: site.business.legalName,
    url: absoluteUrl("/"),
    logo: absoluteImage(site.business.logoUrl),
    image: absoluteImage(site.business.imageUrl || site.agent.photoUrl),
    email: site.agent.email,
    telephone: site.agent.phone,
    sameAs: sameAs(),
    foundingDate: site.business.foundingYear,
    employee: teamRefs(),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: site.agent.phone,
      email: site.agent.email,
      contactType: "sales",
      areaServed: site.location.state,
    },
  });
}

function websiteNode(): Node {
  return clean({
    "@type": "WebSite",
    "@id": ID.website,
    url: absoluteUrl("/"),
    // No em-dash: it is banned in this project's voice rules and the gate
    // enforces it on page copy. Schema should not quietly disagree.
    name: `${businessName()}, ${agentCredential()} in ${site.location.city}`,
    publisher: { "@id": ID.organization },
    inLanguage: "en-US",
  });
}

function localBusinessNode(): Node {
  return clean({
    "@type": "RealEstateAgent", // a subtype of LocalBusiness, the right fit
    "@id": ID.localBusiness,
    // The practice, not the practitioner. The named licensee is the Person node.
    name: businessName(),
    image: absoluteImage(site.business.imageUrl || site.agent.photoUrl),
    url: absoluteUrl("/"),
    telephone: site.agent.phone,
    email: site.agent.email,
    priceRange: site.business.priceRange,
    address: postalAddress(),
    geo: geo(),
    areaServed: areaServed(),
    openingHoursSpecification: openingHours(),
    aggregateRating: aggregateRating(),
    parentOrganization: { "@id": ID.organization },
    employee: teamRefs(),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Real estate services",
      itemListElement: [...site.buyerNiches, ...site.sellerNiches].map((n) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: n.title },
      })),
    },
    sameAs: sameAs(),
  });
}

function personNode(member: TeamMember): Node {
  return clean({
    "@type": "Person",
    "@id": personId(member.slug),
    name: member.name,
    jobTitle: member.title,
    description: member.bio.join(" "),
    image: absoluteImage(member.photoUrl),
    telephone: member.phone,
    email: member.email,
    worksFor: { "@id": ID.organization },
    memberOf: { "@id": ID.localBusiness },
    knowsAbout: [...site.buyerNiches, ...site.sellerNiches].map((n) => n.title),
    // Group social profiles represent the lead's public identity.
    sameAs: member.lead ? sameAs() : [],
  });
}

function teamPersonNodes(): Node[] {
  return site.team.map(personNode);
}

/** All team members as { "@id" } references — for employee/member arrays. */
function teamRefs() {
  return site.team.map((m) => ({ "@id": personId(m.slug) }));
}

/** The base graph — Organization + WebSite + LocalBusiness + one Person each. */
export function baseGraph() {
  return graph([
    organizationNode(),
    websiteNode(),
    localBusinessNode(),
    ...teamPersonNodes(),
  ]);
}

// ---- Page-specific node builders ------------------------------------------

type Crumb = { name: string; path: string };

function breadcrumbNode(path: string, crumbs: Crumb[]): Node {
  return {
    "@type": "BreadcrumbList",
    "@id": `${absoluteUrl(path)}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

/** Canonical path for a process track. One place, so nothing drifts. */
function processPathFor(track: "selling" | "buying") {
  return track === "buying" ? "/process/buying" : "/process";
}

function webPageNode(opts: {
  path: string;
  title: string;
  description?: string;
  type?: string; // WebPage | ContactPage | AboutPage | CollectionPage
  /** Which process track this page links into, if any. Puts the reference in
   *  the graph as well as the markup, so a crawler sees one documented method
   *  rather than sixty unrelated services. A buyer page must cite the BUYING
   *  HowTo; citing the selling one would describe the wrong service. */
  citesProcess?: "selling" | "buying" | false;
}): Node {
  return clean({
    "@type": opts.type || "WebPage",
    "@id": `${absoluteUrl(opts.path)}#webpage`,
    url: absoluteUrl(opts.path),
    name: opts.title,
    description: opts.description,
    isPartOf: { "@id": ID.website },
    about: { "@id": ID.localBusiness },
    breadcrumb: { "@id": `${absoluteUrl(opts.path)}#breadcrumb` },
    // `mentions`, not `about`: the page is about selling a home in a place and
    // it REFERENCES the method. A minimal TYPED stub, not a bare {"@id"} —
    // the canonical HowTo lives on /process, so a bare reference is
    // unresolvable inside this page's own graph and validate:schema rejects it.
    mentions: opts.citesProcess
      ? {
          "@type": "HowTo",
          "@id": `${absoluteUrl(processPathFor(opts.citesProcess))}#howto`,
          name:
            opts.citesProcess === "buying"
              ? "How we help you buy a home, step by step"
              : "How we sell a home, step by step",
          url: absoluteUrl(processPathFor(opts.citesProcess)),
        }
      : undefined,
    relatedLink: opts.citesProcess
      ? absoluteUrl(processPathFor(opts.citesProcess))
      : undefined,
    inLanguage: "en-US",
  });
}

function serviceNode(opts: {
  path: string;
  name: string;
  description?: string;
  areaName?: string;
}): Node {
  return clean({
    "@type": "Service",
    "@id": `${absoluteUrl(opts.path)}#service`,
    name: opts.name,
    description: opts.description,
    serviceType: opts.name,
    provider: { "@id": ID.localBusiness },
    areaServed: opts.areaName
      ? { "@type": "Place", name: opts.areaName }
      : areaServed(),
  });
}

// ---- Public page-graph composers (what pages import) ----------------------

export function graph(nodes: Node[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

type FAQ = { q: string; a: string };

function faqNode(path: string, faqs: FAQ[]): Node {
  return {
    "@type": "FAQPage",
    "@id": `${absoluteUrl(path)}#faq`,
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Generic content page: WebPage + BreadcrumbList (+ FAQPage if faqs). */
export function pageSchema(opts: {
  path: string;
  title: string;
  description?: string;
  crumbs: Crumb[];
  type?: string;
  faqs?: FAQ[];
}) {
  const nodes: Node[] = [
    webPageNode(opts),
    breadcrumbNode(opts.path, opts.crumbs),
  ];
  if (opts.faqs && opts.faqs.length) nodes.push(faqNode(opts.path, opts.faqs));
  return graph(nodes);
}

/**
 * /process — WebPage + HowTo + BreadcrumbList + FAQPage.
 *
 * Each section becomes a HowToStep carrying its OWN anchor url. That url is
 * what makes an individual step eligible to be surfaced on its own rather than
 * the whole page, and it is the same anchor every money page, niche page and
 * blog post deep links to. The ids come from content, never from a slugged
 * heading, so rewording a heading cannot silently break the graph.
 *
 * The intro and any section without an id are deliberately excluded: an
 * overview is not a step, and claiming it is would describe a seven step
 * process that does not exist.
 */
export function processSchema(
  content: {
    h1: string;
    metaDescription: string;
    sections: { heading: string; html: string; id?: string }[];
    faqs?: FAQ[];
  },
  /** Which track this page documents. Selling and buying are separate HowTos
   *  with separate steps and separate anchors; conflating them would describe a
   *  thirteen step process that nobody runs. */
  track: "selling" | "buying" = "selling"
) {
  const PATH = track === "buying" ? "/process/buying" : "/process";
  const STEP_IDS =
    track === "buying"
      ? ["ready", "educated", "aligned", "locked"]
      : ["equity", "presentation", "impact", "campaign"];
  const steps = content.sections.filter(
    (s) => s.id && STEP_IDS.includes(s.id)
  );

  const howTo: Node = clean({
    "@type": "HowTo",
    "@id": `${absoluteUrl(PATH)}#howto`,
    name: content.h1,
    description: content.metaDescription,
    inLanguage: "en-US",
    totalTime: "P45D",
    supply: [],
    tool: [],
    provider: { "@id": ID.localBusiness },
    step: steps.map((s, i) =>
      clean({
        "@type": "HowToStep",
        position: i + 1,
        name: s.heading.split(":")[0].trim(),
        // The anchor is the contract. Everything else on the site links here.
        url: `${absoluteUrl(PATH)}#${s.id}`,
        text: stripHtml(s.html).slice(0, 320),
      })
    ),
  });

  const nodes: Node[] = [
    webPageNode({
      path: PATH,
      title: content.h1,
      description: content.metaDescription,
    }),
    breadcrumbNode(
      PATH,
      track === "buying"
        ? [
            { name: "Home", path: "/" },
            { name: "How we sell", path: "/process" },
            { name: "How we buy", path: PATH },
          ]
        : [
            { name: "Home", path: "/" },
            { name: "How we sell", path: "/process" },
          ]
    ),
    howTo,
  ];
  if (content.faqs?.length) nodes.push(faqNode(PATH, content.faqs));
  return graph(nodes);
}

/** Plain text from a content HTML string, for schema fields that take prose. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Niche page (buyer/seller): WebPage + Service + BreadcrumbList. */
export function nicheSchema(
  niche: Niche,
  hub: "buyers" | "sellers",
  faqs?: FAQ[],
  /** The page's own content, so schema says what the page says. Without it the
   *  WebPage name falls back to "<niche> in <office city>", which disagrees with
   *  the visible h1 as soon as an agent's service area is wider than their
   *  office town — schema claiming one place while the page says another.
   *  See .claude/rules/geographic-branding.md. */
  page?: { h1?: string; metaTitle?: string; metaDescription?: string }
) {
  const path = `/${hub}/${niche.slug}`;
  const hubName = hub === "buyers" ? "For Buyers" : "For Sellers";
  const nodes: Node[] = [
    webPageNode({
      path,
      title:
        page?.h1 ?? page?.metaTitle ?? `${niche.title} in ${site.location.city}`,
      description: page?.metaDescription ?? niche.summary,
      citesProcess: hub === "sellers" ? "selling" : "buying",
    }),
    serviceNode({
      path,
      name: niche.title,
      description: niche.summary,
    }),
    breadcrumbNode(path, [
      { name: "Home", path: "/" },
      { name: hubName, path: `/${hub}` },
      { name: niche.menuLabel, path },
    ]),
  ];
  // The specialty pages render their FAQs and, until now, emitted no FAQPage
  // node at all. They are the longest-form pages on the site and were the only
  // ones with zero rich-result eligibility.
  if (faqs && faqs.length) nodes.push(faqNode(path, faqs));
  return graph(nodes);
}

/** Neighborhood hub: WebPage + Place + BreadcrumbList (+ FAQPage if faqs). */
export function areaSchema(area: ServiceArea, faqs?: FAQ[]) {
  const path = `/areas/${area.slug}`;
  const nodes: Node[] = [
    webPageNode({
      path,
      title: area.name,
      description: area.blurb,
      // Area hubs serve buyers and sellers, and carry the selling strip.
      citesProcess: "selling",
    }),
    clean({
      "@type": "Place",
      "@id": `${absoluteUrl(path)}#place`,
      name: `${area.name}, ${site.location.state}`,
      description: area.blurb,
      geo: geoFor(area),
    }),
    breadcrumbNode(path, [
      { name: "Home", path: "/" },
      { name: "Neighborhoods", path: "/areas" },
      { name: area.name, path },
    ]),
  ];
  if (faqs && faqs.length) nodes.push(faqNode(path, faqs));
  return graph(nodes);
}

/** Money page (area × niche): WebPage + Service + Breadcrumb (+ FAQPage if faqs). */
export function moneySchema(
  area: ServiceArea,
  niche: Niche,
  seller: boolean,
  faqs?: FAQ[]
) {
  const path = `/areas/${area.slug}/${niche.slug}`;
  const hub = seller ? "sellers" : "buyers";
  const hubName = seller ? "For Sellers" : "For Buyers";
  const title = `${niche.title} in ${area.name}`;
  const nodes: Node[] = [
    webPageNode({
      path,
      title,
      description: `${niche.summary} ${area.name}.`,
      citesProcess: seller ? "selling" : "buying",
    }),
    serviceNode({
      path,
      name: title,
      description: niche.summary,
      areaName: `${area.name}, ${site.location.city}, ${site.location.state}`,
    }),
    breadcrumbNode(path, [
      // Home first, matching areaSchema and nicheSchema. A trail that starts
      // mid-site reads as a broken hierarchy to a crawler.
      { name: "Home", path: "/" },
      { name: hubName, path: `/${hub}` },
      { name: area.name, path: `/areas/${area.slug}` },
      { name: niche.menuLabel, path },
    ]),
  ];
  if (faqs && faqs.length) nodes.push(faqNode(path, faqs));
  return graph(nodes);
}

/** Meet the Team page: CollectionPage + BreadcrumbList (Persons live in base). */
export function teamPageSchema() {
  const path = "/team";
  return graph([
    webPageNode({
      path,
      title: "Meet the Team",
      description: `The agents behind ${site.brand.logoText}.`,
      type: "CollectionPage",
    }),
    breadcrumbNode(path, [
      { name: "Home", path: "/" },
      { name: "Meet the Team", path },
    ]),
  ]);
}

/** Individual agent page: ProfilePage → the member's Person (from base) + crumb. */
export function teamMemberSchema(member: TeamMember) {
  const path = `/team/${member.slug}`;
  return graph([
    clean({
      "@type": "ProfilePage",
      "@id": `${absoluteUrl(path)}#webpage`,
      url: absoluteUrl(path),
      name: `${member.name}, ${member.title}`,
      isPartOf: { "@id": ID.website },
      about: { "@id": personId(member.slug) },
      mainEntity: { "@id": personId(member.slug) },
      breadcrumb: { "@id": `${absoluteUrl(path)}#breadcrumb` },
      inLanguage: "en-US",
    }),
    breadcrumbNode(path, [
      { name: "Home", path: "/" },
      { name: "Meet the Team", path: "/team" },
      { name: member.name, path },
    ]),
  ]);
}

/** Blog post: BlogPosting + BreadcrumbList. */
export function blogPostSchema(post: {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  /** Google will not show the article rich result at all without an image.
   *  Pass the value from `postImage()` rather than `post.imageUrl` directly, so
   *  a post with no photograph still gets its generated title card. */
  imageUrl?: string;
}) {
  const path = `/blog/${post.slug}`;
  return graph([
    clean({
      "@type": "BlogPosting",
      "@id": `${absoluteUrl(path)}#post`,
      headline: post.title,
      description: post.excerpt,
      image: absoluteImage(post.imageUrl),
      datePublished: post.date,
      dateModified: post.date,
      author: { "@id": LEAD_PERSON_ID },
      publisher: { "@id": ID.organization },
      mainEntityOfPage: { "@id": `${absoluteUrl(path)}#webpage` },
      inLanguage: "en-US",
    }),
    webPageNode({ path, title: post.title, description: post.excerpt }),
    breadcrumbNode(path, [
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: post.title, path },
    ]),
  ]);
}

/** What a listing node is built from. Mirrors the fields on `Listing`. */
type ListingLike = {
  slug: string;
  address: string;
  city: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  description: string[];
  imageUrl?: string;
  status: string;
  geo?: { lat: string; lng: string };
  propertyType?: string;
  yearBuilt?: number;
  lotSqft?: number;
  features?: string[];
};

/**
 * ONE property node, used by BOTH the listing page and the listings index.
 *
 * Shared deliberately. Two builders describing the same house drift apart, and
 * when they do the index contradicts the detail page in a way that only a
 * machine ever reads, so nobody finds out.
 */
function residenceNode(listing: ListingLike) {
  const path = `/listings/${listing.slug}`;
  const hasGeo = hasRealGeo(listing);
  return clean({
    "@type": "SingleFamilyResidence",
    "@id": `${absoluteUrl(path)}#residence`,
    url: absoluteUrl(path),
    name: listing.address,
    description: listing.description.join(" "),
    // Relative paths are silently ignored by Google, per absoluteImage above.
    image: absoluteImage(listing.imageUrl),
    numberOfBedrooms: listing.beds,
    numberOfBathroomsTotal: listing.baths,
    yearBuilt: listing.yearBuilt,
    amenityFeature: listing.features?.length
      ? listing.features.map((f) => ({
          "@type": "LocationFeatureSpecification",
          name: f,
          value: true,
        }))
      : undefined,
    floorSize: {
      "@type": "QuantitativeValue",
      value: listing.sqft,
      unitCode: "FTK",
    },
    address: clean({
      "@type": "PostalAddress",
      streetAddress: listing.address,
      addressLocality: listing.city,
      addressRegion: site.location.state,
      addressCountry: site.location.country,
    }),
    // Coordinates are what let an assistant reason about WHERE a house is
    // rather than only repeat its town name.
    geo: hasGeo
      ? {
          "@type": "GeoCoordinates",
          latitude: listing.geo!.lat,
          longitude: listing.geo!.lng,
        }
      : undefined,
    offers:
      listing.price > 0
        ? {
            "@type": "Offer",
            price: listing.price,
            priceCurrency: "USD",
            availability:
              listing.status === "sold"
                ? "https://schema.org/SoldOut"
                : "https://schema.org/InStock",
          }
        : undefined,
  });
}

/**
 * Listings index: CollectionPage + BreadcrumbList + an ItemList carrying EVERY
 * listing in full.
 *
 * WHY THE WHOLE PROPERTY AND NOT JUST A LINK. This page is the single URL an
 * external assistant gets pointed at: a CRM knowledge base, a voice agent, any
 * crawler. It will not follow a link per property, and nobody is going to
 * register thirty listing URLs by hand and re-register them when inventory
 * changes.
 *
 * This was a real failure, not a hypothesis. An agent's voice caller was trained
 * on her listings page and answered "I don't have one of those" when asked about
 * a property. The page was crawlable and the prices were in the visible HTML,
 * but the structured data described the company and twenty team members and not
 * one house. The assistant learned the staff roster perfectly and knew nothing
 * about the inventory.
 *
 * One page, every property, regenerated from content/listings.ts on every build.
 */
export function listingsPageSchema(listings: ListingLike[] = []) {
  const path = "/listings";
  return graph([
    webPageNode({
      path,
      title: "Listings",
      description: `Current listings from ${site.brand.logoText}.`,
      type: "CollectionPage",
    }),
    breadcrumbNode(path, [
      { name: "Home", path: "/" },
      { name: "Listings", path },
    ]),
    ...(listings.length
      ? [
          clean({
            "@type": "ItemList",
            "@id": `${absoluteUrl(path)}#listings`,
            name: `Listings from ${site.brand.logoText}`,
            numberOfItems: listings.length,
            // Sold homes stay in the list. "Did that one sell?" is a real
            // question an assistant is asked, and each Offer carries the
            // status, so nothing has to guess.
            itemListElement: listings.map((l, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: residenceNode(l),
            })),
          }),
        ]
      : []),
  ]);
}

/** A single listing: SingleFamilyResidence + WebPage + BreadcrumbList. */
export function listingSchema(listing: ListingLike) {
  const path = `/listings/${listing.slug}`;
  return graph([
    residenceNode(listing),
    webPageNode({
      path,
      title: `${listing.address} , ${listing.city}`,
      description: listing.description[0],
    }),
    breadcrumbNode(path, [
      { name: "Home", path: "/" },
      { name: "Listings", path: "/listings" },
      { name: listing.address, path },
    ]),
  ]);
}
