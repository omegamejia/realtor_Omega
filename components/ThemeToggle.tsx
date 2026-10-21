"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "@/components/Icons";

type Theme = "light" | "dark";

/**
 * Manual light/dark toggle. Writes the choice to localStorage and pins it on
 * <html data-theme>, which wins over the OS preference (see globals.css). The
 * no-flash script in layout.tsx applies the saved value before paint; this
 * component only handles user clicks and keeps its own icon in sync.
 */
export function ThemeToggle({
  // Color classes live here so callers can retone the button for the surface it
  // sits on (e.g. the permanently-dark footer band) without fighting the base
  // classes for the same CSS property.
  colorClassName = "border-[color:var(--border)] text-[color:var(--fg-muted)] hover:text-[color:var(--brand)]",
  className = "",
}: {
  colorClassName?: string;
  className?: string;
}) {
  // Start from whatever the pre-paint script already resolved, so the icon
  // matches on first render and there's no flash.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const resolved: Theme =
      document.documentElement.dataset.theme === "dark" ||
      (!document.documentElement.dataset.theme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
        ? "dark"
        : "light";
    setTheme(resolved);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-md border transition-colors ${colorClassName} ${className}`}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
