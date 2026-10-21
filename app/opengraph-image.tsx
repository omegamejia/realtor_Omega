/**
 * THE SOCIAL PREVIEW CARD.
 *
 * This is what Facebook, Instagram, LinkedIn, WhatsApp and iMessage draw when
 * anybody shares a link to this site. Until October 2026 the seed declared no
 * `openGraph` metadata and shipped no image, so a shared link rendered as bare
 * blue text — no picture, no headline, no description.
 *
 * That is worth stating plainly because of who these sites are for: agents
 * following a social-first method, whose entire distribution is sharing links.
 * A link with no preview is the cheapest possible way to lose the click, and it
 * is invisible to the person sharing it.
 *
 * Next.js wires this file into `og:image` and `twitter:image` for every route
 * that does not declare its own, so one file covers the whole site.
 *
 * Deliberately typographic rather than photographic. The seed has no photo it
 * is allowed to assume — `business.heroImageUrl` ships empty, and using a stock
 * image here would present it as this agent's own place, which
 * .claude/rules/image-sourcing.md forbids. A page with its own confirmed hero
 * image can override this file; the default never claims a photo it doesn't have.
 */
import { ImageResponse } from "next/og";
import {
  brandInitials,
  markName,
  markCredential,
  markCity,
  markTagline,
  markPhone,
  markColors,
} from "@/lib/brand-mark";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Social preview card";

export default function OpengraphImage() {
  const name = markName();
  const initials = brandInitials();
  const city = markCity();
  const credential = markCredential();
  const tagline = markTagline();
  const phone = markPhone();

  // Every line below is omitted rather than guessed when its config value is
  // still a placeholder, so an unfinished site shares a clean brand card
  // instead of one reading "[BUSINESS NAME]".
  const strapline = [credential, city && `in ${city}`].filter(Boolean).join(" ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: markColors.brand,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* A rule in the accent color, so the card reads as this brand and not
            as a generic template. */}
        <div style={{ display: "flex", width: 120, height: 10, background: markColors.accent }} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          {name ? (
            <div
              style={{
                display: "flex",
                fontSize: 82,
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.05,
                letterSpacing: -2,
              }}
            >
              {name}
            </div>
          ) : null}

          {strapline ? (
            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontSize: 36,
                color: "#ffffff",
                opacity: 0.85,
              }}
            >
              {strapline}
            </div>
          ) : null}

          {tagline ? (
            <div
              style={{
                display: "flex",
                marginTop: 28,
                fontSize: 30,
                color: "#ffffff",
                opacity: 0.72,
                maxWidth: 880,
                lineHeight: 1.35,
              }}
            >
              {tagline}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* No initials means nothing is configured yet, and then the badge is
              drawn empty — so it is omitted instead. It used to fall back to a
              little house, which is wrong the moment this file is shared with
              the service seeds: a house on a plumber's or a dentist's share
              card is worse than no mark at all. */}
          {initials ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 76,
                height: 76,
                borderRadius: 16,
                background: markColors.accent,
                color: markColors.brand,
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              {initials}
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
          {phone ? (
            <div style={{ display: "flex", fontSize: 30, color: "#ffffff", opacity: 0.8 }}>
              {phone}
            </div>
          ) : null}
        </div>
      </div>
    ),
    size
  );
}
