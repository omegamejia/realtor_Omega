/**
 * Where a visit came from, carried as far as the CRM.
 *
 * Without this, an agent running ads gets leads in GoHighLevel with no idea
 * which ad, post or email produced them — which is the one question the whole
 * measurement package exists to answer. The pixel knows, but only inside Meta's
 * own reporting; the person reading the CRM does not.
 *
 * **First touch wins.** What is kept is the ad that brought them into the site,
 * not the page they happened to be on when they filled the form. Someone clicks
 * an Instagram ad, reads three pages, then submits from the contact page: the
 * lead records Instagram, not "contact page".
 *
 * **No personal data, ever.** Campaign tags and click IDs are about the ad, not
 * the person. The referrer is reduced to a HOSTNAME — "facebook.com", never the
 * full URL, which can carry a search query or someone's profile. Nothing here is
 * read from a cookie or tied to a visitor across sites.
 *
 * Session storage, not local: it describes this visit, and an ad someone clicked
 * six weeks ago is not the reason they came back today.
 */

const KEY = "kmc.attribution";

/** The tags worth keeping. `gclid` / `fbclid` / `msclkid` are the click IDs the
 *  ad platforms add themselves, which is how a lead ties back to one click. */
const PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "msclkid",
] as const;

export type Attribution = Record<string, string>;

export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    // First touch wins: once a session has an origin, later pages never
    // overwrite it.
    if (sessionStorage.getItem(KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const data: Attribution = {};
    for (const key of PARAMS) {
      const value = params.get(key);
      if (value) data[key] = value.slice(0, 120);
    }
    data.landingPath = window.location.pathname.slice(0, 200);
    if (document.referrer) {
      try {
        const host = new URL(document.referrer).hostname;
        // Their own site is not a referrer worth recording.
        if (host && host !== window.location.hostname) data.referrer = host.slice(0, 120);
      } catch {
        /* a referrer that will not parse tells us nothing */
      }
    }
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Private browsing, storage disabled, a browser that refuses. A lead with no
    // campaign attached is fine; a form that throws on submit is not.
  }
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}
