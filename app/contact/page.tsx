import type { Metadata } from "next";
import { site } from "@/site.config";
import { ContactForm } from "@/components/ContactForm";
import { MapEmbed } from "@/components/MapEmbed";
import { JsonLd } from "@/components/JsonLd";
import { pageSchema } from "@/lib/schema";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={pageSchema({
          path: "/contact",
          title: "Contact",
          description: `Get in touch with ${site.agent.name}.`,
          type: "ContactPage",
          crumbs: [
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact" },
          ],
        })}
      />
    <div className="container-page grid gap-12 py-16 lg:grid-cols-2 lg:py-24">
      <div>
        <p className="eyebrow-tick mb-3 text-sm font-semibold uppercase tracking-widest text-[color:var(--accent-text)]">
          Contact
        </p>
        <h1 className="display-h1">
          Let&apos;s start a conversation
        </h1>
        <p className="mt-4 max-w-md text-[color:var(--fg-muted)]">
          Whether you&apos;re buying, selling, or just weighing your options,
          send a note and I&apos;ll get right back to you.
        </p>

        <div className="mt-8 space-y-2 text-sm">
          <p>
            <span className="font-semibold text-[color:var(--fg)]">Phone:</span>{" "}
            <a
              href={`tel:${site.agent.phone.replace(/[^0-9+]/g, "")}`}
              className="text-[color:var(--brand-ink)] hover:underline"
            >
              {site.agent.phone}
            </a>
          </p>
          <p>
            <span className="font-semibold text-[color:var(--fg)]">Email:</span>{" "}
            <a
              href={`mailto:${site.agent.email}`}
              className="text-[color:var(--brand-ink)] hover:underline"
            >
              {site.agent.email}
            </a>
          </p>
          <p>
            <span className="font-semibold text-[color:var(--fg)]">Office:</span>{" "}
            {site.location.address}
          </p>
        </div>

        <div className="mt-8">
          <MapEmbed height={260} label="Google Business Profile" />
        </div>
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-8">
        <ContactForm />
      </div>
    </div>
    </>
  );
}
