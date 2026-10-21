import { site } from "@/site.config";

/**
 * The responsible broker, as advertising has to name it: the brokerage's legal
 * name, then its license number when the config carries one.
 *
 * `brokerageLicense` is read optionally because site.config.ts belongs to the
 * agent and is never overwritten by an engine update. A site set up before the
 * field existed must keep compiling, and simply shows the name alone.
 *
 * A team name is not a brokerage. "The Mashore Group" sat in this field on a
 * live site while every page passed the check, because the check only looked
 * for the word "broker". California requires team advertising to identify the
 * responsible broker; the launch gate now fails a brokerage that is just the
 * site's own name.
 */
export function brokerageLine(): string {
  const a = site.agent as { brokerage?: string; brokerageLicense?: string };
  return [a.brokerage, a.brokerageLicense].filter(Boolean).join(", ");
}
