"use client";

import Link from "next/link";
import { useState } from "react";
import { site, agentCredential } from "@/site.config";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandMark } from "@/components/BrandMark";
import { Menu, Close, ChevronDown, ChevronRight } from "@/components/Icons";

type Sub = { type: "niche" | "area"; slug: string } | null;

const MENUS = {
  buyers: { label: "Buyers", basePath: "/buyers", niches: site.buyerNiches },
  sellers: { label: "Sellers", basePath: "/sellers", niches: site.sellerNiches },
} as const;

export function Navbar() {
  // Desktop cascade state
  const [openTop, setOpenTop] = useState<null | "buyers" | "sellers" | "areas">(
    null
  );
  const [sub, setSub] = useState<Sub>(null);

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);

  const phoneHref = `tel:${site.agent.phone.replace(/[^0-9+]/g, "")}`;

  function enter(top: "buyers" | "sellers" | "areas") {
    setOpenTop(top);
    setSub(null);
  }
  function leave() {
    setOpenTop(null);
    setSub(null);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--surface)]">
      <nav className="container-page flex h-16 items-center justify-between">
        {/* Logo — the site's home button. No separate "Home" link: the logo IS
            the way back home, which is the near-universal web convention. */}
        <Link
          href="/"
          aria-label={`${site.brand.logoText} home`}
          className="group flex items-center gap-2.5 rounded-md transition-opacity hover:opacity-80"
        >
          <BrandMark />
          <span className="whitespace-nowrap text-lg font-bold tracking-tight text-[color:var(--brand-ink)]">
            {site.brand.logoText}
          </span>
          <span className="hidden text-xs font-medium text-[color:var(--fg-subtle)] lg:inline">
            {agentCredential()}
          </span>
        </Link>

        {/* ---------- DESKTOP CASCADE ---------- */}
        <div className="hidden items-center gap-1 md:flex">
          {/* Buyers + Sellers (niche-first cascade) */}
          {(["buyers", "sellers"] as const).map((key) => {
            const menu = MENUS[key];
            return (
              <div
                key={key}
                className="relative"
                onMouseEnter={() => enter(key)}
                onMouseLeave={leave}
                onKeyDown={(e) => e.key === "Escape" && leave()}
              >
                <button
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={openTop === key}
                  onClick={() => (openTop === key ? leave() : enter(key))}
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
                    openTop === key
                      ? "text-[color:var(--brand-ink)]"
                      : "text-[color:var(--fg-muted)] hover:text-[color:var(--brand-ink)]"
                  }`}
                >
                  {menu.label}
                  <Chevron open={openTop === key} />
                </button>

                {openTop === key && (
                  <MegaPanel>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Col A — niches */}
                      <Column heading={`${menu.label} by need`}>
                        {menu.niches.map((n) => (
                          <FlyRow
                            key={n.slug}
                            href={`${menu.basePath}/${n.slug}`}
                            active={sub?.type === "niche" && sub.slug === n.slug}
                            onHover={() => setSub({ type: "niche", slug: n.slug })}
                            hasChildren
                          >
                            {n.menuLabel}
                          </FlyRow>
                        ))}
                      </Column>

                      {/* Col B — neighborhoods */}
                      <Column heading="By neighborhood">
                        {site.serviceAreas.map((a) => (
                          <FlyRow
                            key={a.slug}
                            href={`/areas/${a.slug}`}
                            active={sub?.type === "area" && sub.slug === a.slug}
                            onHover={() => setSub({ type: "area", slug: a.slug })}
                            hasChildren
                          >
                            {a.name}
                          </FlyRow>
                        ))}
                      </Column>

                      {/* Col C — the cascade flyout */}
                      <Column heading="" tinted>
                        <CascadeFlyout menuKey={key} sub={sub} />
                      </Column>
                    </div>
                  </MegaPanel>
                )}
              </div>
            );
          })}

          {/* Areas (area-first cascade) */}
          <div
            className="relative"
            onMouseEnter={() => enter("areas")}
            onMouseLeave={leave}
            onKeyDown={(e) => e.key === "Escape" && leave()}
          >
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={openTop === "areas"}
              onClick={() => (openTop === "areas" ? leave() : enter("areas"))}
              className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
                openTop === "areas"
                  ? "text-[color:var(--brand-ink)]"
                  : "text-[color:var(--fg-muted)] hover:text-[color:var(--brand-ink)]"
              }`}
            >
              Areas
              <Chevron open={openTop === "areas"} />
            </button>

            {openTop === "areas" && (
              <MegaPanel>
                <div className="grid grid-cols-2 gap-2">
                  <Column heading="Neighborhoods">
                    {site.serviceAreas.map((a) => (
                      <FlyRow
                        key={a.slug}
                        href={`/areas/${a.slug}`}
                        active={sub?.type === "area" && sub.slug === a.slug}
                        onHover={() => setSub({ type: "area", slug: a.slug })}
                        hasChildren
                      >
                        {a.name}
                      </FlyRow>
                    ))}
                  </Column>
                  <Column heading="" tinted>
                    <AreaFlyout sub={sub} />
                  </Column>
                </div>
              </MegaPanel>
            )}
          </div>

          <Link
            href="/listings"
            className="px-3 py-2 text-sm font-medium text-[color:var(--fg-muted)] transition-colors hover:text-[color:var(--brand-ink)]"
          >
            Listings
          </Link>
          <Link
            href="/team"
            className="px-3 py-2 text-sm font-medium text-[color:var(--fg-muted)] transition-colors hover:text-[color:var(--brand-ink)]"
          >
            Team
          </Link>
          <Link
            href="/blog"
            className="px-3 py-2 text-sm font-medium text-[color:var(--fg-muted)] transition-colors hover:text-[color:var(--brand-ink)]"
          >
            Blog
          </Link>
          <Link
            href="/contact"
            className="px-3 py-2 text-sm font-medium text-[color:var(--fg-muted)] transition-colors hover:text-[color:var(--brand-ink)]"
          >
            Contact
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <a
            href={phoneHref}
            className="hidden whitespace-nowrap text-sm font-semibold text-[color:var(--fg-muted)] lg:inline"
          >
            {site.agent.phone}
          </a>
          <Link
            href="/contact"
            className="hidden whitespace-nowrap rounded-md bg-[var(--brand-cta)] px-4 py-2 text-sm font-semibold text-[color:var(--on-brand)] transition-opacity hover:opacity-90 sm:inline-flex"
          >
            Get in touch
          </Link>
          {/* Theme toggle — desktop cluster */}
          <ThemeToggle className="hidden md:inline-flex" />
          {/* Mobile hamburger */}
          <button
            aria-label="Menu"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[color:var(--border-strong)] md:hidden"
          >
            <Menu aria-hidden />
          </button>
        </div>
      </nav>

      {/* ---------- MOBILE DRAWER (simplified — tap accordions) ---------- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col overflow-y-auto bg-[color:var(--surface)] shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-[color:var(--border)] px-5">
              <Link
                href="/"
                aria-label={`${site.brand.logoText} home`}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 font-bold text-[color:var(--brand-ink)]"
              >
                <BrandMark size="sm" />
                {site.brand.logoText}
              </Link>
              <button
                aria-label="Close"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[color:var(--border-strong)] text-lg"
              >
                <Close aria-hidden />
              </button>
            </div>

            <div className="flex-1 px-4 py-2">
              {/* Buyers / Sellers accordions — one level of niches + areas */}
              {(["buyers", "sellers"] as const).map((key) => {
                const menu = MENUS[key];
                const open = mobileSection === key;
                return (
                  <div key={key} className="border-b border-[color:var(--border)]">
                    <button
                      onClick={() => setMobileSection(open ? null : key)}
                      className="flex w-full items-center justify-between py-4 text-left text-base font-semibold text-[color:var(--fg)]"
                    >
                      {menu.label}
                      <span className="text-[color:var(--fg-subtle)]">{open ? "–" : "+"}</span>
                    </button>
                    {open && (
                      <div className="pb-4">
                        <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--fg-subtle)]">
                          By need
                        </p>
                        {menu.niches.map((n) => (
                          <MobileLink
                            key={n.slug}
                            href={`${menu.basePath}/${n.slug}`}
                            onClick={() => setMobileOpen(false)}
                          >
                            {n.menuLabel}
                          </MobileLink>
                        ))}
                        <p className="px-1 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--fg-subtle)]">
                          By neighborhood
                        </p>
                        {site.serviceAreas.map((a) => (
                          <MobileLink
                            key={a.slug}
                            href={`/areas/${a.slug}`}
                            onClick={() => setMobileOpen(false)}
                          >
                            {a.name}
                          </MobileLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Areas accordion */}
              <div className="border-b border-[color:var(--border)]">
                <button
                  onClick={() =>
                    setMobileSection(mobileSection === "areas" ? null : "areas")
                  }
                  className="flex w-full items-center justify-between py-4 text-left text-base font-semibold text-[color:var(--fg)]"
                >
                  Areas
                  <span className="text-[color:var(--fg-subtle)]">
                    {mobileSection === "areas" ? "–" : "+"}
                  </span>
                </button>
                {mobileSection === "areas" && (
                  <div className="pb-4">
                    {site.serviceAreas.map((a) => (
                      <MobileLink
                        key={a.slug}
                        href={`/areas/${a.slug}`}
                        onClick={() => setMobileOpen(false)}
                      >
                        {a.name}
                      </MobileLink>
                    ))}
                  </div>
                )}
              </div>

              <MobileLink href="/listings" onClick={() => setMobileOpen(false)} top>
                Listings
              </MobileLink>
              <MobileLink href="/team" onClick={() => setMobileOpen(false)} top>
                Meet the Team
              </MobileLink>
              <MobileLink href="/blog" onClick={() => setMobileOpen(false)} top>
                Blog
              </MobileLink>
              <MobileLink href="/contact" onClick={() => setMobileOpen(false)} top>
                Contact
              </MobileLink>
            </div>

            <div className="border-t border-[color:var(--border)] p-4">
              <Link
                href="/contact"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center rounded-md bg-[var(--brand-cta)] px-4 py-3 text-sm font-semibold text-[color:var(--on-brand)]"
              >
                Get in touch
              </Link>
              <a
                href={phoneHref}
                className="mt-3 block text-center text-sm font-semibold text-[color:var(--fg-muted)]"
              >
                {site.agent.phone}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ---------- Desktop flyout content ---------- */

function CascadeFlyout({
  menuKey,
  sub,
}: {
  menuKey: "buyers" | "sellers";
  sub: Sub;
}) {
  const menu = MENUS[menuKey];

  if (!sub) {
    return (
      <p className="px-2 py-4 text-sm text-[color:var(--fg-subtle)]">
        Hover a need or a neighborhood to see every page →
      </p>
    );
  }

  if (sub.type === "niche") {
    const niche = menu.niches.find((n) => n.slug === sub.slug);
    if (!niche) return null;
    return (
      <>
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--fg-subtle)]">
          {niche.menuLabel} in…
        </p>
        {site.serviceAreas.map((a) => (
          <FlyRow key={a.slug} href={`/areas/${a.slug}/${niche.slug}`}>
            {a.name}
          </FlyRow>
        ))}
      </>
    );
  }

  // sub.type === "area"
  const area = site.serviceAreas.find((a) => a.slug === sub.slug);
  if (!area) return null;
  return (
    <>
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--fg-subtle)]">
        {menu.label} in {area.name}
      </p>
      {menu.niches.map((n) => (
        <FlyRow key={n.slug} href={`/areas/${area.slug}/${n.slug}`}>
          {n.menuLabel}
        </FlyRow>
      ))}
    </>
  );
}

function AreaFlyout({ sub }: { sub: Sub }) {
  if (!sub || sub.type !== "area") {
    return (
      <p className="px-2 py-4 text-sm text-[color:var(--fg-subtle)]">
        Hover a neighborhood to see every buyer &amp; seller page →
      </p>
    );
  }
  const area = site.serviceAreas.find((a) => a.slug === sub.slug);
  if (!area) return null;
  return (
    <div className="grid grid-cols-2 gap-x-2">
      <div>
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--fg-subtle)]">
          Buyers
        </p>
        {site.buyerNiches.map((n) => (
          <FlyRow key={n.slug} href={`/areas/${area.slug}/${n.slug}`}>
            {n.menuLabel}
          </FlyRow>
        ))}
      </div>
      <div>
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--fg-subtle)]">
          Sellers
        </p>
        {site.sellerNiches.map((n) => (
          <FlyRow key={n.slug} href={`/areas/${area.slug}/${n.slug}`}>
            {n.menuLabel}
          </FlyRow>
        ))}
      </div>
    </div>
  );
}

/* ---------- Small building blocks ---------- */

function MegaPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute left-1/2 top-full z-50 w-[720px] -translate-x-1/2 pt-2">
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-lg">
        {children}
      </div>
    </div>
  );
}

function Column({
  heading,
  children,
  tinted = false,
}: {
  heading: string;
  children: React.ReactNode;
  tinted?: boolean;
}) {
  return (
    <div className={tinted ? "rounded-lg bg-[color:var(--surface-muted)] p-2" : "p-1"}>
      {heading && (
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--fg-subtle)]">
          {heading}
        </p>
      )}
      {children}
    </div>
  );
}

function FlyRow({
  href,
  children,
  active = false,
  onHover,
  hasChildren = false,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  onHover?: () => void;
  hasChildren?: boolean;
}) {
  return (
    <Link
      href={href}
      onMouseEnter={onHover}
      className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
        active
          ? "bg-[var(--brand-cta)] text-[color:var(--on-brand)]"
          : "text-[color:var(--fg-muted)] hover:bg-[color:var(--surface-muted)]"
      }`}
    >
      {children}
      {hasChildren && (
        <ChevronRight
          size={16}
          aria-hidden
          className={active ? "text-white/80" : "text-[color:var(--fg-subtle)]"}
        />
      )}
    </Link>
  );
}

function MobileLink({
  href,
  children,
  onClick,
  top = false,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
  top?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        top
          ? "block border-b border-[color:var(--border)] py-4 text-base font-semibold text-[color:var(--fg)]"
          : "block rounded-md px-1 py-2 text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--brand-ink)]"
      }
    >
      {children}
    </Link>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      className={`inline-flex transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <ChevronDown size={16} />
    </span>
  );
}
