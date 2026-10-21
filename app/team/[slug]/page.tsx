import type { Metadata } from "next";
import Link from "next/link";
import { brokerageLine } from "@/lib/brokerage";
import { notFound } from "next/navigation";
import { site, getTeamMember } from "@/site.config";
import { ButtonLink } from "@/components/ui";
import { MapEmbed } from "@/components/MapEmbed";
import { JsonLd } from "@/components/JsonLd";
import { teamMemberSchema } from "@/lib/schema";

export function generateStaticParams() {
  return site.team.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const member = getTeamMember(slug);
  return {
    title: member ? `${member.name}: ${member.title}` : "Meet the Team",
    description: member?.bio?.[0],
  };
}

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = getTeamMember(slug);
  if (!member) notFound();

  const phoneHref = `tel:${member.phone.replace(/[^0-9+]/g, "")}`;

  return (
    <>
      <JsonLd data={teamMemberSchema(member)} />

      <div className="container-page pt-10">
        <Link
          href="/team"
          className="inline-block text-sm font-medium text-[color:var(--fg-subtle)] transition-colors hover:text-[color:var(--brand-ink)]"
        >
          ← Meet the team
        </Link>
      </div>

      <div className="container-page grid gap-12 pb-16 pt-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="flex aspect-[4/5] items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)]">
            {member.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.photoUrl}
                alt={member.name}
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="text-center text-[color:var(--fg-subtle)]">
                <p className="text-4xl">📷</p>
                <p className="mt-2 text-sm">Photo</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h1 className="display-h1">{member.name}</h1>
          <p className="mt-2 text-lg font-medium text-[color:var(--accent-text)]">{member.title}</p>
          <p className="mt-1 text-sm text-[color:var(--fg-subtle)]">
            {member.license} · {brokerageLine()}
          </p>

          <div className="mt-6 space-y-4 text-[color:var(--fg-muted)]">
            {member.bio.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/contact">Work with {member.name.split(" ")[0]}</ButtonLink>
            <a
              href={phoneHref}
              className="inline-flex items-center justify-center rounded-md border border-[var(--brand)] px-6 py-3 text-sm font-semibold text-[color:var(--brand-ink)] hover:bg-[var(--brand)] hover:text-white"
            >
              {member.phone}
            </a>
          </div>

          <p className="mt-4 text-sm text-[color:var(--fg-muted)]">
            <a
              href={`mailto:${member.email}`}
              className="text-[color:var(--brand-ink)] hover:underline"
            >
              {member.email}
            </a>
          </p>

          <div className="mt-10">
            <MapEmbed height={240} label={`Serving all of ${site.location.city}`} />
          </div>
        </div>
      </div>
    </>
  );
}
