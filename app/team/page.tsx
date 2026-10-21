import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/site.config";
import { Section, Card } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { JsonLd } from "@/components/JsonLd";
import { teamPageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Meet the Team",
  description: `The agents behind ${site.brand.logoText}.`,
};

export default function TeamPage() {
  return (
    <>
      <JsonLd data={teamPageSchema()} />
      <PageHero
        eyebrow="Meet the team"
        title="The agents behind"
        titleAccent={site.brand.logoText}
      />
      <Section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {site.team.map((m) => (
            <Link key={m.slug} href={`/team/${m.slug}`}>
              <Card>
                <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-[color:var(--surface-muted)]">
                  {m.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.photoUrl}
                      alt={m.name}
                      className="h-full w-full rounded-lg object-cover"
                    />
                  ) : (
                    <span className="text-sm text-[color:var(--fg-subtle)]">Photo</span>
                  )}
                </div>
                <h2 className="mt-4 text-lg font-semibold text-[color:var(--fg)]">
                  {m.name}
                </h2>
                <p className="text-sm text-[color:var(--accent)]">{m.title}</p>
                <p className="mt-1 text-xs text-[color:var(--fg-subtle)]">{m.license}</p>
                <span className="mt-3 inline-block text-sm font-semibold text-[color:var(--brand)]">
                  View profile →
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
