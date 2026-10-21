import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/site.config";
import { buildCore } from "@/lib/knowledge";

/**
 * /ai-brief — the one URL to hand to any external AI.
 *
 * A GoHighLevel knowledge base, a voice agent, a chatbot on another platform:
 * point it here and it gets the business, the agent, the team, every area
 * served, every service, and every listing in full detail — regenerated from
 * site.config.ts and content/ on every deploy, so it is never out of date.
 *
 * WHY NOT JUST CRAWL THE WHOLE DOMAIN. That is the obvious move and it works
 * badly here. The site carries 253 money pages that are near-identical on
 * purpose — the same method described for a different town, because that is
 * what ranks. A retrieval index built from those buries everything else: a
 * caller asks about one street and the closest matches are eleven variants of
 * the same page. This block says each thing once, which is what a retrieval
 * index actually wants.
 *
 * WHY NOT PASTE IT INTO THE CRM. Because then it has to be re-pasted on every
 * price change, every status change, every new listing and every new service
 * area — and it will not be. Within a week the CRM is quoting prices the
 * website no longer shows. The website is the single source of truth; this page
 * is how other systems read it.
 *
 * Deliberately plain: a crawler extracts text, and styling is noise in what it
 * extracts. Humans have the rest of the site.
 *
 * PUBLIC. See the warning in lib/listing-brief.ts about what must never go into
 * a listing's showing instructions.
 */

export const metadata: Metadata = {
  title: "AI brief (data feed)",
  description:
    "Everything this site knows — business, team, areas served, services and current listings — in one page, for AI assistants and voice agents.",
};

export default function AiBriefPage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-2xl font-bold text-[color:var(--fg)]">AI brief</h1>
      <p className="mt-2 max-w-2xl text-[color:var(--fg-muted)]">
        Everything {site.brand.logoText} knows, in one page: the business, the
        team, the areas served, the services, and every current listing in full
        detail. It is generated from the site&rsquo;s own data and changes
        whenever the site changes, so an AI assistant pointed at this address
        always reads the current version. For the normal site, start at{" "}
        <Link href="/" className="underline">
          the home page
        </Link>
        .
      </p>

      <pre className="mt-8 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-6 text-sm leading-relaxed text-[color:var(--fg-muted)]">
        {buildCore()}
      </pre>
    </div>
  );
}
