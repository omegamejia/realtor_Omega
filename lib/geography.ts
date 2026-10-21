/**
 * How the service areas actually sit relative to one another.
 *
 * Without this, an assistant answering "do you have anything in Brentwood?" has
 * no way to know that Willow Lake Court is in Discovery Bay rather than
 * Brentwood, or that Discovery Bay is five miles away rather than fifty. It
 * matches on words, so it either offers a home in the wrong town as though it
 * were in the right one, or refuses to mention a genuinely close alternative.
 *
 * Both failures are avoidable, because site.config.ts already carries latitude
 * and longitude for the areas and a parentCity for each neighborhood. This
 * turns that into plain sentences a language model can actually reason with:
 * which places are cities, which are neighborhoods inside them, and roughly how
 * far apart the towns are.
 *
 * Distances are straight-line miles between area centers. They are for
 * orientation in conversation — "about ten minutes further out" — never for
 * quoting a commute. Drive time is not distance, and the brief says so.
 *
 * Regenerated from config on every deploy, so adding an area updates this
 * without anyone writing it down twice.
 */

import { site, areaGeo, type ServiceArea } from "@/site.config";
import { isUnfilled } from "@/lib/unfilled";

type Point = { lat: number; lng: number };

// Coordinates are stored as strings in config (they are copied from a map, not
// computed), so every read parses.
function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : null;
}

function coordsFor(a: ServiceArea): Point | null {
  const lat = num(a.lat), lng = num(a.lng);
  if (lat !== null && lng !== null) return { lat, lng };
  const g = areaGeo[a.slug];
  const gLat = num(g?.lat), gLng = num(g?.lng);
  if (gLat !== null && gLng !== null) return { lat: gLat, lng: gLng };
  // Neighborhoods often carry no coordinates of their own. Falling back to the
  // parent city is accurate enough for "is this the same town or the next one",
  // which is the only question this data is used to answer.
  if (a.parentCity) {
    const parent = site.serviceAreas.find((p) => p.name === a.parentCity);
    if (parent) {
      const pLat = num(parent.lat), pLng = num(parent.lng);
      if (pLat !== null && pLng !== null) return { lat: pLat, lng: pLng };
      const pg = areaGeo[parent.slug];
      const gLat2 = num(pg?.lat), gLng2 = num(pg?.lng);
      if (gLat2 !== null && gLng2 !== null) return { lat: gLat2, lng: gLng2 };
    }
  }
  return null;
}

function milesBetween(a: Point, b: Point): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// An area like "East Contra Costa County" is the whole region, not a town beside
// the towns. Left in the list it produces nonsense: the county reported as a
// town, and Brentwood "0.0 miles" from it because they share a center point.
// Detected by name, since the config has no field that marks it.
function isRegion(name: string): boolean {
  return /\b(county|region|area|valley|metro|peninsula)\b/i.test(name);
}

export function geographyBrief(): string {
  // A placeholder town ("[Neighborhood One]") is not a place to describe to a
  // caller. See lib/unfilled.ts.
  const areas = site.serviceAreas.filter((a) => !isUnfilled(a.name));
  if (!areas.length) return "";

  // A "town" is an area with no parent and that is not the whole region.
  const towns = areas.filter((a) => !a.parentCity && !isRegion(a.name));
  const regions = areas.filter((a) => !a.parentCity && isRegion(a.name));
  const lines: string[] = [];

  lines.push(`## How these areas relate to each other`);
  lines.push(
    `Use this to tell a caller whether a property is in the town they asked about, ` +
      `and to offer a genuinely nearby alternative when it is not. Distances are ` +
      `straight-line miles between area centers, for orientation only. They are NOT ` +
      `drive times and must never be quoted as one.`
  );
  lines.push("");

  for (const r of regions) {
    const inside = towns.map((t2) => t2.name).join(", ");
    lines.push(
      `- ${r.name} is the whole region this team covers, not a town. It contains: ${inside}.` +
        ` If a caller says they are "in ${r.name}", ask which town, because the towns inside it are genuinely different markets.`
    );
  }
  if (regions.length) lines.push("");

  for (const town of towns) {
    const inside = areas.filter((a) => a.parentCity === town.name);
    const here = coordsFor(town);

    const near = here
      ? towns
          .filter((t) => t.name !== town.name)
          .map((t) => {
            const p = coordsFor(t);
            return p ? { name: t.name, mi: milesBetween(here, p) } : null;
          })
          .filter((x): x is { name: string; mi: number } => x !== null)
          // Two areas sharing a center point are the same place described at
          // different scales, not neighbors.
          .filter((x) => x.mi >= 0.3)
          .sort((a, b) => a.mi - b.mi)
          .slice(0, 4)
      : [];

    let line = `- ${town.name} is a town.`;
    if (inside.length)
      line += ` Neighborhoods we cover inside it: ${inside.map((a) => a.name).join(", ")}.`;
    if (near.length)
      line +=
        ` Closest other towns we cover: ` +
        near.map((n) => `${n.name} about ${n.mi.toFixed(1)} miles`).join(", ") +
        `.`;
    lines.push(line);
  }

  lines.push("");
  // The example comes from THIS agent's areas. It used to be a literal, "A home
  // in Garin Ranch is in Brentwood", from the site this rule was written for, so
  // every other agent's assistant was told about a neighborhood and a town they
  // do not serve. Found by a test session reading /ai-brief.
  const sample = areas.find((a) => a.parentCity);
  lines.push(
    (sample
      ? `Every neighborhood listed above is INSIDE its town. ` +
        `A home in ${sample.name} is in ${sample.parentCity}. `
      : "") +
      `A home in a town that is not the one the caller asked about is ` +
      `not in their town, however close it is. Say where it actually is, and how ` +
      `far, and let them decide.`
  );

  return lines.join("\n");
}
