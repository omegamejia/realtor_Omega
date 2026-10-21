import { site } from "@/site.config";
import { hasRealGeo } from "@/lib/listings";
import { Pin } from "@/components/Icons";

/**
 * MapEmbed — the Google Business Profile / Google Maps slot.
 *
 * Appears in the footer (so it's on EVERY page) and on area + contact pages.
 *
 * TWO DIFFERENT MAPS, and the distinction matters:
 *
 * 1. NO `query` → this is the BUSINESS map. It must resolve to the agent's
 *    Google Business Profile, not a search for their street address. An address
 *    search drops a generic pin on a building; the Business Profile card carries
 *    the business name, reviews, hours, and photos, and every click on it is a
 *    signal attached to the listing Google actually ranks. Same pixels, entirely
 *    different value.
 * 2. WITH a `query` → this is a PLACE map (a service area, a listing address).
 *    It stays a plain Maps lookup, because it is about that place, not the
 *    business — sending someone who clicked a neighborhood map to the agent's
 *    profile would be a bait-and-switch.
 */
export function MapEmbed({
  query,
  geo,
  height = 300,
  label,
}: {
  query?: string;
  /**
   * Exact coordinates. ALWAYS pass these for a listing.
   *
   * A text query is resolved by Google at render time, which is fine for a town
   * and unreliable for a house: "1102 Riverbend Drive" exists in more than one
   * state, and a rural address with no match at all drops the pin on the town
   * centre without reporting an error. Nobody notices, because the map still
   * looks like a map.
   *
   * Coordinates cannot be ambiguous, so when they are present they win and the
   * query is kept only for the human-readable link.
   */
  geo?: { lat: string; lng: string };
  height?: number;
  label?: string;
}) {
  const isBusinessMap = !query && !geo;
  const gbpUrl = site.location.googleBusinessProfileUrl;
  const searchQuery = query || site.location.address;
  // "0" is the placeholder the seed ships and the gate rejects. Treat it as
  // absent here too, so a forgotten geocode degrades to the text search rather
  // than pinning the property to the Gulf of Guinea.
  const hasGeo = hasRealGeo({ geo });
  const point = hasGeo ? `${geo!.lat},${geo!.lng}` : "";

  // The business embed belongs ONLY to the business map. Using it for a place
  // map put a map of the office on every neighborhood page, labelled with the
  // neighborhood's name, which is worse than no map: it is a confidently wrong
  // one. A place map builds its own embed from the query instead.
  const embedUrl = isBusinessMap
    ? site.location.googleMapsEmbedUrl
    : hasGeo
      ? `https://www.google.com/maps?q=${encodeURIComponent(point)}&z=15&output=embed`
      : `https://www.google.com/maps?q=${encodeURIComponent(searchQuery)}&output=embed`;

  // The business map prefers the Business Profile link. Falling back to an
  // address search keeps it clickable before the profile URL is captured.
  // For a listing the link carries the ADDRESS rather than the coordinates,
  // because a visitor who taps through should see a place name, not numbers.
  const mapsLink =
    isBusinessMap && gbpUrl
      ? gbpUrl
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          searchQuery
        )}`;

  if (embedUrl) {
    const frame = (
      <div className="overflow-hidden rounded-xl border border-[color:var(--border)]">
        <iframe
          src={embedUrl}
          width="100%"
          height={height}
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={label || "Map"}
        />
      </div>
    );

    // On the business map, pair the embed with a direct link to the profile.
    // The iframe is Google's and swallows its own clicks, so without this there
    // is no route from the site to the listing at all.
    if (isBusinessMap && gbpUrl) {
      return (
        <div className="space-y-2">
          {frame}
          <a
            href={gbpUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--brand-ink)] hover:underline"
          >
            <Pin size={16} aria-hidden />
            View {site.brand.logoText} on Google
          </a>
        </div>
      );
    }

    // A PLACE map (a listing, an area) gets the same treatment: the iframe is
    // Google's and swallows its own clicks, so without this the address on
    // screen is not actually a route to the map. Someone who wants directions
    // has to retype it.
    if (label) {
      return (
        <div className="space-y-2">
          {frame}
          <a
            href={mapsLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--brand-ink)] hover:underline"
          >
            <Pin size={16} aria-hidden />
            {label}
          </a>
        </div>
      );
    }
    return frame;
  }

  return (
    <a
      href={mapsLink}
      target="_blank"
      rel="noreferrer"
      className="group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-muted)] text-center transition-colors hover:border-[var(--brand)]"
      style={{ height }}
    >
      <Pin size={30} className="text-[color:var(--fg-subtle)]" aria-hidden />
      <span className="text-sm font-semibold text-[color:var(--fg-muted)] group-hover:text-[color:var(--brand-ink)]">
        {label || "Google Business Profile map"}
      </span>
      <span className="max-w-xs px-4 text-xs text-[color:var(--fg-subtle)]">
        Placeholder. Add <code>googleMapsEmbedUrl</code> in site.config.ts.
        Copy it from your Google Business Profile, not from an address search.
      </span>
    </a>
  );
}
