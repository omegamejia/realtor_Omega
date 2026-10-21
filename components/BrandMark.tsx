/**
 * BrandMark — the site's logo mark: a brand-colored tile with an accent dot.
 * ONE definition, used in the navbar (desktop + mobile) and the footer. Both
 * colors come from the agent's brand tokens, so it re-themes automatically.
 * Swap this file's markup for a real <img> logo and it changes everywhere.
 */
export function BrandMark({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const box = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const dot = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <span
      aria-hidden
      className={`grid ${box} shrink-0 place-items-center rounded-lg bg-[var(--brand-cta)] ${className}`}
    >
      <span className={`${dot} rounded-sm bg-[var(--accent)]`} />
    </span>
  );
}
