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
    })
  );
}

// ---- Base nodes (emitted on every page via the layout) --------------------

function organizationNode(): Node {
  return clean({
    "@type": "Organization",
    "@id": ID.organization,
    name: site.agent.name,
    legalName: site.business.legalName,
    url: absoluteUrl("/"),
    logo: site.business.logoUrl,
    image: site.business.imageUrl || site.agent.photoUrl,
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
    name: `${site.agent.name} — ${agentCredential()}`,
    publisher: { "@id": ID.organization },
    inLanguage: "en-US",
  });
}

function localBusinessNode(): Node {
  return clean({
    "@type": "RealEstateAgent", // a subtype of LocalBusiness — the right fit
    "@id": ID.localBusiness,
    name: site.agent.name,
    image: site.business.imageUrl || site.agent.photoUrl,
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
    image: member.photoUrl,
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

function webPageNode(opts: {
  path: string;
  title: string;
  description?: string;
  type?: string; // WebPage | ContactPage | AboutPage | CollectionPage
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

/** Niche page (buyer/seller): WebPage + Service + BreadcrumbList. */
export function nicheSchema(niche: Niche, hub: "buyers" | "sellers") {
  const path = `/${hub}/${niche.slug}`;
  const hubName = hub === "buyers" ? "For Buyers" : "For Sellers";
  return graph([
    webPageNode({
      path,
      title: `${niche.title} in ${site.location.city}`,
      description: niche.summary,
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
  ]);
}

/** Neighborhood hub: WebPage + Place + BreadcrumbList (+ FAQPage if faqs). */
export function areaSchema(area: ServiceArea, faqs?: FAQ[]) {
  const path = `/areas/${area.slug}`;
  const nodes: Node[] = [
    webPageNode({
      path,
      title: area.name,
      description: area.blurb,
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
    webPageNode({ path, title, description: `${niche.summary} — ${area.name}.` }),
    serviceNode({
      path,
      name: title,
      description: niche.summary,
      areaName: `${area.name}, ${site.location.city}, ${site.location.state}`,
    }),
    breadcrumbNode(path, [
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
      name: `${member.name} — ${member.title}`,
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
}) {
  const path = `/blog/${post.slug}`;
  return graph([
    clean({
      "@type": "BlogPosting",
      "@id": `${absoluteUrl(path)}#post`,
      headline: post.title,
      description: post.excerpt,
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

/** Listings index: CollectionPage + BreadcrumbList. */
export function listingsPageSchema() {
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
  ]);
}

/** A single listing: SingleFamilyResidence + WebPage + BreadcrumbList. */
export function listingSchema(listing: {
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
}) {
  const path = `/listings/${listing.slug}`;
  return graph([
    clean({
      "@type": "SingleFamilyResidence",
      "@id": `${absoluteUrl(path)}#residence`,
      name: listing.address,
      description: listing.description.join(" "),
      image: listing.imageUrl,
      numberOfBedrooms: listing.beds,
      numberOfBathroomsTotal: listing.baths,
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
    }),
    webPageNode({
      path,
      title: `${listing.address} — ${listing.city}`,
      description: listing.description[0],
    }),
    breadcrumbNode(path, [
      { name: "Home", path: "/" },
      { name: "Listings", path: "/listings" },
      { name: listing.address, path },
    ]),
  ]);
}
