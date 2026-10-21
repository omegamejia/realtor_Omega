/**
 * THE BRAND MARK — identity for the two generated images, resolved from ANY
 * seed's config shape.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS SHAPE-TOLERANT AND NOT JUST `site.agent.name`
 *
 * The first version of this file read `site.agent.name`, `agentCredential()`
 * and `site.location.city` directly. That works on this seed and nowhere else,
 * and the seeds have genuinely different shapes:
 *
 *   realtor-site-seed        agent{}   brand{primaryColor, accentColor}  location{}
 *   local-service-site-seed  owner{}   brand{primaryColor, accentColor}  location{}
 *   service-site-seed        business{} brand{accent, logoSrc}           locations[]
 *
 * Writing three near-identical copies would mean three places for the same bug,
 * and a fourth seed would need a fourth. So every value below is resolved by
 * trying a list of known paths in order and taking the first REAL one. A new
 * seed with a new field name needs one entry added here, not a new file.
 *
 * ---------------------------------------------------------------------------
 * THE RULE THAT GOVERNS EVERY LOOKUP
 *
 * These images are generated at BUILD time on a seed whose config is still full
 * of [BRACKETS], and unlike a page nobody proofreads an og:image — it goes out
 * on every share and the person sharing never sees it. So a bracketed or
 * obviously-unset value counts as ABSENT, and the mark degrades to something
 * honest rather than printing "[BUSINESS NAME]".
 *
 * See .claude/rules/truth-verification.md — empty is safe, wrong is harmful.
 */
import * as config from "@/site.config";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Loose = Record<string, any>;
const mod = config as unknown as Loose;
const site = (mod.site ?? {}) as Loose;

/** A value counts only once a human has replaced the placeholder. */
export function real(value: unknown): string {
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return "";
  const v = value.trim();
  if (!v) return "";
  if (/[[\]]/.test(v)) return ""; // still [AGENT FULL NAME]
  if (/^(your|agent|business|company|owner)\b/i.test(v)) return "";
  if (/^(tbd|n\/?a|none|placeholder)$/i.test(v)) return "";
  return v;
}

/** Read a dotted path off the config without throwing on a missing branch. */
function at(path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    const next = (acc as Loose)[key];
    return next;
  }, site);
}

/** Call an exported helper (agentCredential, ownerCredential, primaryLocation…). */
function callExport(name: string): unknown {
  const fn = mod[name];
  if (typeof fn !== "function") return undefined;
  try {
    return fn();
  } catch {
    return undefined; // a helper that needs a filled-in config is simply absent
  }
}

/** First real value among config paths; `fn:name` calls an export instead. */
function firstOf(...paths: string[]): string {
  for (const p of paths) {
    const raw = p.startsWith("fn:") ? callExport(p.slice(3)) : at(p);
    // Some seeds store credentials as a list.
    const value = Array.isArray(raw) ? raw.find((x) => real(x)) : raw;
    const got = real(value);
    if (got) return got;
  }
  return "";
}

/** The business's own name, as it should appear on a share card. */
export function markName(): string {
  return firstOf(
    "brand.logoText",
    "business.name",
    "business.legalName",
    "owner.businessName",
    "agent.name",
    "owner.name"
  );
}

/** "REALTOR®", "Licensed Plumber" — whatever this seed calls the credential. */
export function markCredential(): string {
  return firstOf(
    "fn:agentCredential",
    "fn:ownerCredential",
    "agent.credentialLabel",
    "owner.credentialLabel",
    "business.credentials"
  );
}

/** The town the business is IN — never a claim about where it works. */
export function markCity(): string {
  const direct = firstOf("location.city", "business.city");
  if (direct) return direct;
  const primary = callExport("primaryLocation") as Loose | undefined;
  if (primary) {
    const got = real(primary.city ?? primary.town);
    if (got) return got;
  }
  const list = at("business.locations");
  if (Array.isArray(list) && list.length) {
    const got = real((list[0] as Loose)?.city);
    if (got) return got;
  }
  return "";
}

export function markTagline(): string {
  return firstOf("agent.tagline", "owner.tagline", "business.tagline", "business.what");
}

export function markPhone(): string {
  const direct = firstOf("agent.phone", "owner.phone", "business.phone", "location.phone");
  if (direct) return direct;
  const primary = callExport("primaryLocation") as Loose | undefined;
  return primary ? real(primary.phone) : "";
}

/**
 * Up to two initials, COMPUTED from a confirmed name — never invented.
 * "" when nothing is filled in yet, which tells the mark to draw a glyph.
 */
export function brandInitials(): string {
  const source = markName() || firstOf("agent.name", "owner.name");
  if (!source) return "";
  const words = source
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  // "The Mashore Group" should read MG, not TM.
  const meaningful = words.filter(
    (w) =>
      !/^(the|a|an|of|and|at|group|team|co|inc|llc|realty|real|estate|services?|solutions?)$/i.test(
        w
      )
  );
  const pick = meaningful.length ? meaningful : words;
  return pick
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Colors for the generated images.
 *
 * `service-site-seed` has no `primaryColor` at all — only `brand.accent` — so
 * the ground falls back through what exists and finally to a neutral slate.
 * The fallback is a real decision, not a guess about the business: a dark
 * neutral reads as deliberate behind white type on every brand, which is more
 * than can be said for an arbitrary hue.
 */
export const markColors = {
  get brand(): string {
    return (
      real(at("brand.primaryColor")) ||
      real(at("brand.primary")) ||
      real(at("brand.accent")) ||
      "#1f2a37"
    );
  },
  get accent(): string {
    return (
      real(at("brand.accentColor")) ||
      real(at("brand.accent")) ||
      real(at("brand.primaryColor")) ||
      "#c9a24b"
    );
  },
};
