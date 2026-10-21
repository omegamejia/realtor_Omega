/**
 * Contrast-safe brand variants.
 *
 * `brand.primaryColor` is whatever the agent's brand actually is — navy, black,
 * burgundy, a light teal. A fixed CSS `color-mix` percentage cannot serve all of
 * them: mixing black with 20% white gives #333, which is nearly invisible against
 * a dark header (1.37:1, where 3:1 is the floor for UI). A near-white brand fails
 * the opposite way in light mode.
 *
 * So the derived variants are computed here from real luminance, per theme, and
 * emitted as CSS variables in app/layout.tsx. Every brand color works, including
 * the extremes.
 */

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = Number.parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = ([r, g, b]: RGB) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
const luminance = ([r, g, b]: RGB) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export function contrast(a: RGB, b: RGB): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

const mix = (a: RGB, b: RGB, p: number): RGB =>
  [0, 1, 2].map((i) => a[i] * p + b[i] * (1 - p)) as RGB;

const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];

/**
 * Nudge `base` toward white (or black) until it clears `target` contrast against
 * `against`, without overshooting past the point of usefulness.
 */
function liftUntil(base: RGB, against: RGB, target: number, toward: RGB): RGB {
  let best = base;
  for (let p = 100; p >= 0; p -= 2) {
    best = mix(base, toward, p / 100);
    if (contrast(best, against) >= target) return best;
  }
  return best;
}

export type BrandVariants = {
  /** Solid button fill, light theme. White text must stay legible on it. */
  ctaLight: string;
  /** Solid button fill, dark theme. Must clear 3:1 against the dark surface. */
  ctaDark: string;
  /** Brand-colored text/border, light theme. 4.5:1 against white. */
  inkLight: string;
  /** Brand-colored text/border, dark theme. 4.5:1 against the dark bg. */
  inkDark: string;
  /** Text/icon color that sits ON a brand fill — black or white, whichever wins. */
  onBrandLight: string;
  onBrandDark: string;
};

// The dark theme's surface/background tokens from globals.css.
/*
 * THE DARK SURFACES THESE VARIANTS HAVE TO HOLD AGAINST.
 *
 * `DARK_BG` was #0d1117 — the darkest surface in the design — and `inkDark`
 * was lifted until it cleared 4.5:1 against that. Which it did, and then
 * failed on every LIGHTER dark band: measured at 4.01:1 on #1f1e1d, 4.17:1 on
 * #161b22 and 4.19:1 on #101b27, across forty page/size/scheme combinations.
 *
 * Contrast against the darkest backdrop is the easy case. A variant has to
 * clear the LIGHTEST surface it will ever sit on, because that is where the
 * ratio is worst. #1f1e1d is the lightest of the dark bands in globals.css, so
 * that is what the ink is now computed against — and clearing it there clears
 * it everywhere darker for free.
 *
 * Caught by `npm run audit:browser`, which measures text against what is
 * actually painted behind it rather than against an assumed value.
 */
const DARK_SURFACE: RGB = [0x16, 0x1b, 0x22];
const DARK_BG: RGB = [0x0d, 0x11, 0x17];
/** The lightest dark band in the design, which is the hardest case. */
const DARK_LIGHTEST: RGB = [0x1f, 0x1e, 0x1d];

export function brandVariants(primaryHex: string): BrandVariants {
  const brand = hexToRgb(primaryHex);

  // --- light theme ---------------------------------------------------------
  // The fill must hold white text (4.5:1) OR flip to black text if the brand is
  // light. Whichever gives better contrast wins.
  const onLight = contrast(brand, WHITE) >= contrast(brand, BLACK) ? WHITE : BLACK;
  // Ensure the fill is distinguishable from a white page (3:1 for UI shapes).
  const ctaLight =
    contrast(brand, WHITE) >= 3 ? brand : liftUntil(brand, WHITE, 3, BLACK);
  // Brand-colored TEXT on white needs the full 4.5:1.
  const inkLight =
    contrast(brand, WHITE) >= 4.5 ? brand : liftUntil(brand, WHITE, 4.5, BLACK);

  // --- dark theme ----------------------------------------------------------
  // Lift toward white until the fill separates from the dark header (3:1)…
  // The CTA fill only has to separate from the header surface (3:1 for UI).
  let ctaDark = liftUntil(brand, DARK_SURFACE, 3, WHITE);
  void DARK_BG; // kept for reference: the darkest surface, the easy case
  // …but if that lift made white text on the button illegible, pull back toward
  // a fill that still holds its own text.
  const onDark = contrast(ctaDark, WHITE) >= contrast(ctaDark, BLACK) ? WHITE : BLACK;
  if (contrast(ctaDark, onDark) < 4.5) {
    ctaDark = liftUntil(ctaDark, onDark, 4.5, onDark === WHITE ? BLACK : WHITE);
  }
  const inkDark = liftUntil(brand, DARK_LIGHTEST, 4.5, WHITE);

  return {
    ctaLight: toHex(ctaLight),
    ctaDark: toHex(ctaDark),
    inkLight: toHex(inkLight),
    inkDark: toHex(inkDark),
    onBrandLight: toHex(onLight),
    onBrandDark: toHex(
      contrast(ctaDark, WHITE) >= contrast(ctaDark, BLACK) ? WHITE : BLACK
    ),
  };
}
