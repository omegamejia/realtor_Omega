/**
 * One place that says something happened, for the agent's own tags.
 *
 * Two kinds of thing are worth recording on an agent's site: a **lead**, which is
 * a form they can follow up, and a **contact action** — tapping the phone number,
 * the email link, or directions to the office. The second kind is most of what
 * happens on a phone and none of it reaches the CRM, so without it an agent
 * running ads concludes the site does nothing.
 *
 * **Nothing here ever says who.** No name, email, phone or address goes into an
 * event or a URL. Meta's advanced matching and Google's enhanced conversions both
 * exist and are both deliberately unused: that is the agent's clients' data, and
 * a small lift in attribution does not buy the right to hand it over.
 *
 * All of it does nothing at all when no tag is configured, because
 * `components/Analytics.tsx` renders nothing and neither function exists.
 */

import { site } from "@/site.config";

/**
 * The tracking IDs, read WITHOUT assuming `site.config.ts` has a `tracking`
 * section at all.
 *
 * This is not defensive padding — it is load-bearing. `site.config.ts` is the
 * agent's own file and `scripts/update-engine.mjs` never touches it (it is on
 * the `THEIRS` list, deliberately). `SiteConfig` is `typeof site`, inferred from
 * that literal. So on a site created before this section existed, the key is
 * simply absent from the type, and `site.tracking?.x` is a compile error rather
 * than a safe lookup — optional chaining cannot rescue a property the type does
 * not have.
 *
 * What that cost, before this existed: an agent ran `npm run update:engine`,
 * got new engine files that referenced `site.tracking`, and their next deploy
 * failed to build. The launch gate did not catch it because it tests against a
 * running dev server, and a dev server does not typecheck. Their site was fine
 * until the moment they tried to publish.
 *
 * Any future engine code that reads a NEW key out of `site.config.ts` has the
 * same problem and needs the same treatment.
 */
type TrackingIds = {
  metaPixelId?: string;
  googleTagId?: string;
  clarityProjectId?: string;
  googleAdsConversion?: string;
};

export function trackingIds(): TrackingIds {
  return (site as { tracking?: TrackingIds }).tracking ?? {};
}

type Fn = (...args: unknown[]) => void;
type Tags = { fbq?: Fn; gtag?: Fn };

const RETRY_MS = 300;
const MAX_TRIES = 10;

/**
 * Fire when the tags exist, and wait a little while if they do not yet.
 *
 * The tag scripts load after the page hydrates, so anything fired the instant a
 * page mounts arrives first and vanishes. Measured, not theorised: a guide page
 * recorded its view as nothing at all, because the mount effect ran a beat
 * before the pixel defined itself. A form submitted seconds later was fine,
 * which is exactly why this was invisible.
 *
 * It gives up after about three seconds. A visitor who left that fast is not a
 * lead, and an event queued forever is a memory leak with no reader.
 */
function send(fire: (tags: Tags) => void, attempt = 0): void {
  if (typeof window === "undefined") return;
  const tags = window as unknown as Tags;
  if (!tags.fbq && !tags.gtag) {
    if (attempt < MAX_TRIES) setTimeout(() => send(fire, attempt + 1), RETRY_MS);
    return;
  }
  try {
    fire(tags);
  } catch {
    // An ad blocker, a script that failed to load, a browser with storage off.
    // None of that should ever break what the visitor was doing.
  }
}

/**
 * A form was submitted and accepted. Called AFTER the server says yes, never on
 * the button press, so a failed submission is not counted and the agent's ad
 * reporting matches their CRM.
 */
export function trackLead(source: string): void {
  send((t) => {
    t.fbq?.("track", "Lead", { content_category: source });
    t.gtag?.("event", "generate_lead", { method: source });
    // Google Ads does not treat `generate_lead` as a conversion by itself.
    // Either the agent imports it from Analytics, or Ads gives them a conversion
    // label and it has to be sent explicitly — this is that send. Without one of
    // the two, an agent wires everything up correctly and their Ads account
    // still reports zero conversions.
    const conversion = trackingIds().googleAdsConversion;
    if (conversion) t.gtag?.("event", "conversion", { send_to: conversion });
  });
}

/**
 * Someone tapped the phone number, the email address, or directions. Meta's
 * standard "Contact" event covers the first two, which is what an agent's ad
 * account expects to optimise against.
 */
export function trackContact(method: "phone" | "email" | "directions"): void {
  const metaEvent = method === "directions" ? "FindLocation" : "Contact";
  send((t) => {
    t.fbq?.("track", metaEvent, { contact_method: method });
    t.gtag?.("event", method === "directions" ? "directions_click" : "contact", { method });
  });
}

/**
 * A guide, checklist or other lead magnet was opened after the opt-in. Separate
 * from the lead itself, so an agent can see how many people actually read the
 * thing they traded their email for.
 */
export function trackGuideView(title: string): void {
  send((t) => {
    t.fbq?.("track", "ViewContent", { content_name: title, content_type: "guide" });
    t.gtag?.("event", "view_guide", { guide: title });
  });
}
