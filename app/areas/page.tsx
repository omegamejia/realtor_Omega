import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/site.config";
import { Section, Card } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { JsonLd } from "@/components/JsonLd";
import { pageSchema } from "@/lib/schema";

export const metadata: Metadata = { title: "Neighborhoods" };

export default function AreasPage() {
  return (
    <>
      <JsonLd
        data={pageSchema({
          path: "/areas",
          title: `Neighborhoods in ${site.location.city}`,
          description: `Local expertise across ${site.location.city}.`,
          type: "CollectionPage",
          crumbs: [
            { name: "Home", path: "/" },
            { name: "Neighborhoods", path: "/areas" },
          ],
        })}
      />
      <PageHero
        eyebrow="Areas I serve"
        title="Local expertise across"
        titleAccent={site.location.city}
      />
    <Section>
      <div className="grid gap-6 md:grid-cols-3">
        {site.serviceAreas.map((a) => (
          <Link key={a.slug} href={`/areas/${a.slug}`}>
            <Card>
              <h2 className="text-lg font-semibold text-[color:var(--fg)]">{a.name}</h2>
              <p className="mt-2 text-sm text-[color:var(--fg-muted)]">{a.blurb}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-[color:var(--brand)]">
                Explore {a.name} →
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </Section>
    </>
  );
}
