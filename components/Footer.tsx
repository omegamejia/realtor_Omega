import Link from "next/link";
import { site, agentCredential } from "@/site.config";
import { MapEmbed } from "@/components/MapEmbed";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";

const SOCIALS: { key: keyof typeof site.social; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "tiktok", label: "TikTok" },
];

export function Footer() {
  const activeSocials = SOCIALS.filter((s) => site.social[s.key]);

  return (
    <footer className="border-t border-[color:var(--footer-border)] bg-[color:var(--footer-bg)] text-[color:var(--footer-fg-muted)]">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        {/* Brand + contact */}
        <div className="md:col-span-2">
          <Link
            href="/"
            aria-label={`${site.brand.logoText} home`}
            className="inline-flex items-center gap-2.5 text-lg font-bold text-[color:var(--footer-fg)] transition-opacity hover:opacity-80"
          >
            <BrandMark />
            {site.brand.logoText}
          </Link>
          <p className="mt-2 text-sm text-[color:var(--footer-fg-muted)]">
            {agentCredential()} · {site.agent.brokerage}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[color:var(--footer-fg-muted)]">
            {site.location.address}
          </p>
          <p className="mt-2 text-sm">
            <a href={`tel:${site.agent.phone.replace(/[^0-9+]/g, "")}`} className="hover:text-[color:var(--footer-fg)]">
              {site.agent.phone}
            </a>
            <br />
            <a href={`mailto:${site.agent.email}`} className="hover:text-[color:var(--footer-fg)]">
              {site.agent.email}
            </a>
          </p>
          <p className="mt-4 text-xs text-[color:var(--footer-fg-subtle)]">{site.agent.license}</p>

          {/* Socials */}
          {/* No socials → render nothing. This used to show a bracketed hint,
              which appeared on every page and permanently failed launch:check for
              any agent who genuinely has no social accounts. Missing socials are a
              config concern, surfaced by realtor-site-setup — not page content. */}
          {activeSocials.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-3">
              {activeSocials.map((s) => (
                <a
                  key={s.key}
                  href={site.social[s.key]}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-[color:var(--footer-border)] px-3 py-1.5 text-xs font-medium text-[color:var(--footer-fg-muted)] hover:border-[color:var(--footer-fg)] hover:text-[color:var(--footer-fg)]"
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Explore */}
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-[color:var(--footer-fg)]">
            Explore
          </p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/buyers" className="hover:text-[color:var(--footer-fg)]">For Buyers</Link></li>
            <li><Link href="/sellers" className="hover:text-[color:var(--footer-fg)]">For Sellers</Link></li>
            <li><Link href="/areas" className="hover:text-[color:var(--footer-fg)]">Neighborhoods</Link></li>
            <li><Link href="/listings" className="hover:text-[color:var(--footer-fg)]">Listings</Link></li>
            <li><Link href="/free/seller-guide" className="hover:text-[color:var(--footer-fg)]">Free Seller Guide</Link></li>
            <li><Link href="/team" className="hover:text-[color:var(--footer-fg)]">Meet the Team</Link></li>
            <li><Link href="/blog" className="hover:text-[color:var(--footer-fg)]">Blog</Link></li>
            <li><Link href="/contact" className="hover:text-[color:var(--footer-fg)]">Contact</Link></li>
          </ul>
        </div>

        {/* Map — appears on every page via the footer */}
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-[color:var(--footer-fg)]">
            Find us
          </p>
          <MapEmbed height={180} label="Google Business Profile" />
        </div>
      </div>

      <div className="border-t border-[color:var(--footer-border)]">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 text-xs text-[color:var(--footer-fg-subtle)] sm:flex-row">
          <p>
            © {new Date().getFullYear()} {site.agent.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <p>Equal Housing Opportunity</p>
            <ThemeToggle colorClassName="border-[color:var(--footer-border)] text-[color:var(--footer-fg-muted)] hover:border-[color:var(--footer-fg)] hover:text-[color:var(--footer-fg)]" />
          </div>
        </div>
      </div>
    </footer>
  );
}
