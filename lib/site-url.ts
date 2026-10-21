/**
 * WHERE THIS SITE THINKS IT LIVES.
 *
 * One resolver, used by `absoluteUrl()`, the sitemap, robots.txt and every schema
 * `@id` anchor, so they can never disagree with one another.
 *
 * ---------------------------------------------------------------------------
 * THE PROBLEM THIS FIXES
 *
 * `site.url` is authored by hand and ships as `https://[YOURDOMAIN].com`. The
 * normal life of one of these sites is: deploy to a Vercel URL, run on it for
 * days or weeks while the pages get written, then attach the agent's real
 * domain.
 *
 * Through that whole window the site's own idea of its address is a placeholder,
 * so `robots.txt` names `[YOURDOMAIN].com` as its host and every schema `@id`
 * anchors to a domain that does not exist. Nothing errors. Nothing looks broken.
 * A crawler is simply told the wrong canonical home for every page, and schema
 * `@id` values that name a dead domain cannot merge into a knowledge-graph
 * entity at all.
 *
 * And on the day the real domain is attached, nothing updates unless somebody
 * remembers to edit `site.url` and redeploy. That is the step that gets missed.
 *
 * ---------------------------------------------------------------------------
 * HOW IT RESOLVES, in order
 *
 *   1. `NEXT_PUBLIC_SITE_URL` — an explicit override. Use it to fix a live site
 *      without editing config.
 *   2. `site.url`, but ONLY once it is a real domain. A `[BRACKETED]` value is
 *      treated as unset, which is the whole point.
 *   3. `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_PROJECT_PRODUCTION_URL`
 *      — Vercel sets these itself, and they FOLLOW THE CUSTOM DOMAIN once one is
 *      attached to the project. This is what makes the move automatic.
 *   4. `VERCEL_URL` — the individual deployment. Correct for a preview, which
 *      should describe itself rather than production.
 *   5. Nothing — local development. Returns "", absolute URLs become relative,
 *      which is right on a machine nobody else can reach.
 *
 * ---------------------------------------------------------------------------
 * THE ONE THING IT CANNOT DO
 *
 * These pages are generated at BUILD time, so attaching a domain does not
 * rewrite a build that already happened. **The site must be redeployed after the
 * domain is attached.** What this changes is that the redeploy then needs nobody
 * to remember anything: the next deploy picks the new domain up on its own.
 *
 * `npm run check:domain -- https://theirdomain.com` verifies a live site agrees
 * with its own sitemap, robots and schema anchors after a move.
 */

import { site } from "@/site.config";

/** A configured value counts only once it is a real domain, not a placeholder. */
function configured(): string {
  const u = (site as { url?: string }).url ?? "";
  if (!u) return "";
  if (/\[|\]/.test(u)) return ""; // still [YOURDOMAIN].com
  if (/yourdomain|example\.com/i.test(u)) return "";
  return u;
}

function resolve(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;

  const fromConfig = configured();
  if (fromConfig) return fromConfig;

  const prod =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;

  const deployment = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (deployment) return `https://${deployment}`;

  return "";
}

/** The site's base URL, no trailing slash. "" in local development. */
export function siteUrl(): string {
  return resolve().replace(/\/+$/, "");
}

/**
 * Whether the site knows a real public address.
 *
 * False locally, and false on a deploy where nothing resolved — which the launch
 * gate should treat as a failure, because a live site that does not know its own
 * address publishes a sitemap and a set of schema anchors that are actively
 * misleading rather than merely absent.
 */
export function hasPublicUrl(): boolean {
  const u = siteUrl();
  return Boolean(u) && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(u);
}
