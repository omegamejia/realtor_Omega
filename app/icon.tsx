/**
 * THE BROWSER TAB ICON.
 *
 * Until October 2026 the seed shipped no icon file at all, so every site built
 * from it showed a blank page icon in the tab and logged a 404 for
 * /favicon.ico on every single page load. Measured on a real site: it was the
 * only entry in Lighthouse's console-errors audit.
 *
 * Generated rather than a static file, because the one thing it has to match is
 * the brand color, and that is per-site config.
 *
 * Initials when a real name is configured, and otherwise a plain brand-coloured
 * tile. Deliberately NO industry glyph: this file is shared by the realtor seed
 * and the service seeds, and a little house on a plumber's or a dentist's site
 * is worse than no mark at all.
 */
import { ImageResponse } from "next/og";
import { brandInitials, markColors } from "@/lib/brand-mark";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  const initials = brandInitials();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: markColors.brand,
          color: "#ffffff",
          borderRadius: 12,
          fontSize: initials.length > 1 ? 30 : 38,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        {initials}
      </div>
    ),
    size
  );
}
