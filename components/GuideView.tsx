"use client";

import { useEffect } from "react";
import { trackGuideView } from "@/lib/tracking";

/**
 * Records that the guide somebody traded their email address for was actually
 * opened.
 *
 * It answers a question an agent asks and otherwise cannot: of the people who
 * signed up, how many read the thing? A funnel with plenty of opt-ins and almost
 * no guide views is a promise that is not landing — the email did not arrive,
 * the link is wrong, or the offer was better than what followed — and none of
 * that is visible from the lead count alone.
 *
 * Renders nothing, and does nothing at all when no tag is configured.
 */
export function GuideView({ title }: { title: string }) {
  useEffect(() => {
    trackGuideView(title);
  }, [title]);
  return null;
}
