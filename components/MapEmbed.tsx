import { site } from "@/site.config";
import { Pin } from "@/components/Icons";

/**
 * MapEmbed — the Google Business Profile / Google Maps slot.
 *
 * Appears in the footer (so it's on EVERY page) and on area + contact pages.
 *
 * - If site.location.googleMapsEmbedUrl is set → renders the live, clickable
 *   Google map iframe.
 * - Otherwise → renders a clean placeholder that STILL links out to a Google
 *   Maps search (so it's clickable even before intake fills the embed URL).
 */
export function MapEmbed({
  query,
  height = 300,
  label,
}: {
  query?: string;
  height?: number;
  label?: string;
}) {
  const embedUrl = site.location.googleMapsEmbedUrl;
  const searchQuery = query || site.location.address;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    searchQuery
  )}`;

  if (embedUrl) {
    return (
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
      <span className="text-sm font-semibold text-[color:var(--fg-muted)] group-hover:text-[color:var(--brand)]">
        {label || "Google Business Profile map"}
      </span>
      <span className="max-w-xs px-4 text-xs text-[color:var(--fg-subtle)]">
        Placeholder. Add <code>googleMapsEmbedUrl</code> in site.config.ts.
        Click to open in Google Maps.
      </span>
    </a>
  );
}
