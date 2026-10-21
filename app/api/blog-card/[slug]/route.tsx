import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPost, posts } from "@/content/posts";
import { site } from "@/site.config";

/**
 * The two weights, read off disk at build time.
 *
 * Until these existed, `fontWeight` on this card did NOTHING — the only face
 * available was Satori's bundled `noto-sans-v27-latin-regular.ttf`, which ships
 * one weight, so a card rendered at 400 and at 800 produced byte-identical
 * PNGs. Every headline was regular. It looked passable at full size and
 * dissolved at the ~400px a social feed actually renders.
 *
 * These are Inter, instanced from `public/fonts/Inter-latin.woff2` — the
 * variable file (100-900, SIL OFL 1.1) this site already serves. So the card
 * is set in the same face as the site, nothing new is downloaded at build or
 * request time, and the licence is the one already documented in
 * public/fonts/LICENSE.md. 64KB and 65KB; Satori cannot read woff2, which is
 * why static TTFs have to exist alongside it.
 */
async function fonts() {
  const dir = join(process.cwd(), "public", "fonts");
  const [regular, bold] = await Promise.all([
    readFile(join(dir, "Inter-400.ttf")),
    readFile(join(dir, "Inter-700.ttf")),
  ]);
  return [
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

/**
 * Generated title card, used as a blog post's image when there is no real
 * photograph for it.
 *
 * WHY THIS EXISTS. A post with no image is not a cosmetic problem. Google will
 * not show the article rich result at all without one, so an imageless post is a
 * post that cannot earn the search treatment it was written for. Before this, a
 * post without a photo rendered a grey "Cover image · set per post" box.
 *
 * WHY IT IS GENERATED RATHER THAN A STOCK PHOTO. `.claude/rules/image-sourcing.md`
 * forbids presenting stock or AI imagery as a real photo of a real place, and a
 * generic house photo captioned with a city it was not taken in is exactly that.
 * A typographic card claims nothing. It carries the brand and never implies a
 * place it has not seen.
 *
 * It never overrides a real image. `postImage()` prefers `post.imageUrl` and only
 * falls back here, so an agent who has a photograph keeps it.
 *
 * ACCESSIBILITY, and why this is a light card rather than a dark one.
 * The first version was near-black with near-white type. Its contrast was never
 * the problem: it measured 16.5:1, comfortably AAA. It was still hard to look at,
 * because large light type on a very dark field produces halation, where strokes
 * appear to bleed outward. Astigmatism is common and halation hits it hard, and
 * no contrast ratio detects it. So the ground is light, the type is heavier, and
 * the sizes are larger. Contrast stayed AAA and the glow is gone.
 *
 * The accent is darkened until it actually passes against the ground, rather than
 * trusted. An agent's brand colour is whatever their brand is; a pale one used
 * raw as text would fail badly. Krista's gold is a case in point: #C9AB42 reads
 * 8.1:1 on the old dark ground but only 2.04:1 on this light one, which is a
 * fail. `readable()` fixes that automatically for every agent's colour.
 *
 * FONT WEIGHT DOES NOTHING HERE, and that is worth knowing before someone tries
 * to fix the card by reaching for a heavier number. The only face available is
 * `next/dist/compiled/@vercel/og/noto-sans-v27-latin-regular.ttf`, which ships
 * one weight. Rendering the same card at 400 and at 800 produces byte-identical
 * PNGs. The `fontWeight` values below are kept because they become real the
 * moment a bold face is supplied, and inert until then.
 *
 * Getting genuinely heavier strokes means committing a TTF to the repo. Satori
 * cannot read woff2, so `next/font`'s downloads are no help. That is a real
 * decision (a file every clone carries) rather than a tweak, so it is not taken
 * unilaterally here.
 *
 * No font is fetched at render time on purpose. It would put a network call
 * between an agent and their own blog card, and this has to work on a bad hotel
 * connection the morning of a listing appointment.
 */

export const dynamic = "force-static";

/** Pre-render one card per post at build time, so nothing renders on request. */
export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

const PAPER = "#f7f5f0";
const INK = "#141619";

function srgb(c: number) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Darkens a colour step by step until it clears `target` against the ground.
 * Returns ink if it never gets there, because an unreadable brand colour is not
 * worth preserving on a card whose only job is to be read.
 */
function readable(hex: string, ground: string, target = 4.5): string {
  const h = hex.replace("#", "");
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return INK;
  let [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (let i = 0; i < 24; i++) {
    const cur = "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
    if (contrast(cur, ground) >= target) return cur;
    [r, g, b] = [r, g, b].map((c) => Math.max(0, Math.round(c * 0.88)));
  }
  return INK;
}

const RAW_ACCENT = site.brand.accentColor || "#C9AB42";
const ACCENT_TEXT = readable(RAW_ACCENT, PAPER, 4.5);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = getPost(slug);

  const title = post?.title ?? site.brand.logoText;
  const city = post?.city ?? site.location?.city ?? "";

  // Long headlines step down in bands. A smooth ramp produces sizes that look
  // accidental; deliberate steps do not.
  //
  // Retuned when the real bold arrived. Bold at a given size reads noticeably
  // larger than regular, and the old bands were set for regular: a 73-character
  // title came out at 68px and filled the canvas corner to corner, three lines
  // deep and tight against the gutter, while a 38-character one floated in dead
  // space. Both ends now land in roughly the same optical weight.
  const len = title.length;
  const titleSize = len > 86 ? 50 : len > 68 ? 56 : len > 52 ? 64 : len > 40 ? 72 : 78;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          // CROP-SAFE SIDES. The card is 1200x630, but sites show it in narrower
          // boxes with object-fit: cover: 16:9 here, 16:10 on krista-mashore-site,
          // where 96px is cut from each side. At 72px the first letters of the
          // city, the title and the business name were cut off on the live blog
          // (2026-10-21). 140px keeps every word inside the middle 16:10 area.
          padding: "62px 140px",
          position: "relative",
        }}
      >
        {/* Brand bar. A graphic element, so it carries the accent at full
            strength where the text cannot. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 14,
            background: RAW_ACCENT,
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
          }}
        >
          {city ? (
            <div
              style={{
                display: "flex",
                fontSize: 27,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: ACCENT_TEXT,
                fontWeight: 700,
                marginBottom: 26,
              }}
            >
              {city}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              lineHeight: 1.12,
              color: INK,
              fontWeight: 800,
              letterSpacing: -1,
              maxWidth: 920,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid rgba(20,22,25,0.22)",
            paddingTop: 26,
          }}
        >
          <div style={{ display: "flex", fontSize: 30, color: INK, fontWeight: 700 }}>
            {site.brand.logoText}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#43474d", fontWeight: 600 }}>
            {site.location?.city
              ? `${site.location.city}, ${site.location.state ?? ""}`.trim().replace(/,$/, "")
              : ""}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: await fonts() }
  );
}
