import Link from "next/link";
import type { ReactNode } from "react";

export function Section({
  children,
  className = "",
  muted = false,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return (
    <section
      className={`${muted ? "bg-[color:var(--brand-tint)]" : ""} py-16 sm:py-20`}
    >
      <div className={`container-page ${className}`}>{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[color:var(--accent-text)]">
      {children}
    </p>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-3xl font-bold tracking-tight text-[color:var(--fg)] sm:text-4xl">
      {children}
    </h2>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "solid",
}: {
  href: string;
  children: ReactNode;
  variant?: "solid" | "outline";
}) {
  const base =
    "inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-semibold transition-colors";
  const styles =
    variant === "solid"
      ? "bg-[var(--brand-cta)] text-[color:var(--on-brand)] hover:opacity-90"
      : "border border-[color:var(--brand-ink)] text-[color:var(--brand-ink)] hover:bg-[var(--brand-cta)] hover:text-[color:var(--on-brand)]";
  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-within:ring-2 focus-within:ring-[color:var(--brand)] focus-within:ring-offset-2">
      {children}
    </div>
  );
}
