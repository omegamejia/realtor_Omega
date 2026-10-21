# Making the Turnberry look the default for every seed

## What I found

**The theme was built in the instance and never went back to the seeds.**

`krista-mashore-site` is on the photography-first Turnberry theme, merged as PR #15.
`realtor-site-seed` and `local-service-site-seed` have **none of it**: no `tb.css`,
no `tb.tsx`, no `tb-client.tsx`, no sample-media registry, no Newsreader font.

So the demo instance looks like the reference and every site generated from either
seed ships the older look. That is the whole gap, and it is why what I have been
handing you does not resemble what you are actually putting out.

## What the reference actually is

`app/tb.css` states its own five rules at the top, and they are the spec:

1. **Photographs carry the colour.** Interface is ink on white with one pale grey
   band. Blue water, green trees and warm interiors are the only saturated things.
2. **One light serif, set large.** Whole sentences at headline size, weight 300,
   with small spaced capitals in a geometric sans for labels. **No bold headlines.**
3. **Text links, not buttons.** Small capitals over a hairline underline. The only
   solid pill on the site is the form's submit.
4. **Space around everything.** Sections breathe for most of a screen.
5. **Motion everywhere, never loud.** Rise-ins, photographs settling from a slight
   zoom, hero cross-fade, counting numbers, a drifting photo strip.

Critically: **it restyles the existing classes.** Every page takes the look without
being rewritten, and the colour tokens derive from the existing `--fg` / `--bg`, so
dark mode keeps working.

Zero new npm dependencies. All motion is hand-rolled CSS plus one client component.

### The parts

| File | Lines | What it is |
|---|---|---|
| `app/tb.css` | 3,185 | The whole look. 20 sections: type, layout, header, full-screen menu, hero, stats, photographs, split/quote, image cards, inquiry form, footer, light/dark bands, chapters, menu explorer, desktop cascade, chat bubble, motion |
| `components/tb.tsx` | 377 | `Statement` `StatGrid` `PhotoTicker` `SplitFeature` `QuoteFeature` `PhotoFrame` `VideoBand` `ImageCard` `Pillars` `InquireSection` |
| `components/tb-client.tsx` | 283 | `HeroSlideshow` `CountUp` `AutoVideo` `StackGroup` `FadeCarousel` |
| `components/Reveal.tsx` | 119 | Scroll-reveal wrapper used on nearly every band |
| `components/ScrollRail.tsx` | 131 | Horizontal card rail |
| `components/Accolades.tsx` | 294 | Award strip. Krista-specific |
| `content/sample-media.ts` + `.json` | 83 + 96 slots | The media registry |
| `scripts/shot-list.mjs` | 79 | Turns the registry into `docs/SHOT-LIST.md` |

### The media system, which is the part I most needed and did not have

Every photo frame is filled from `content/sample-media.json`. Each slot carries
`src`, `original`, `license`, `credit`, `title`, and **`need`**: a sentence saying
what the real photograph has to show.

> "Behind the scenes on a listing shoot: our camera on a tripod in a staged,
> sunlit living room, no faces in frame."

That one field does three jobs at once. It fills the frame today, it is the brief
the photographer shoots from (`npm run shot-list`), and `launch:check` blocks any
page still serving from a sample host. Build full, ship honest, and the shot list
writes itself.

**Video is in there too:** Mixkit Free License clips with local posters and the
same `need` line. `VideoBand` and `AutoVideo` render them.

This supersedes the `source-media.mjs` I wrote earlier today. The registry is the
better shape; my verifier is still worth keeping as the thing that *populates* a
registry for a new site.

## What changes, per seed

### Both seeds get

1. `app/tb.css`, imported after `globals.css` in `app/layout.tsx`
2. Newsreader (200/300) + Montserrat via `next/font`, wired to `--font-display` / `--font-sans`
3. `tb.tsx`, `tb-client.tsx`, `Reveal.tsx`, `ScrollRail.tsx`
4. The sample-media registry, `shot-list`, and the launch-check layer that blocks sample hosts
5. Home page recomposed onto the primitives: pinned hero, statement, video band,
   counting stats, carousel, pillars, quote, photo ticker, split feature, area rail,
   inquire section
6. Inner pages alternate light and dark bands in both themes

### Only the realtor seed

- `FeaturedListings`, the listings rail, and the buyers/sellers cascade keep their
  current routes. The primitives drop in around them.

### Only the local-service seed

- The same primitives over `/services` and `/areas` instead of buyers/sellers.

### Has to be generalised, not copied

- **`Accolades.tsx`** is Krista's awards. Either make it a generic
  "proof strip" driven by config, or leave it out of the seeds.
- **The registry contents** are East Contra Costa specific: 58 of its 96 slots are
  her areas. The seeds need a small generic starter set plus the mechanism, and the
  per-site fill happens at setup.

## What will fight this, and has to change with it

1. **`site-design-system/SKILL.md` documents the old look.** Zero mentions of
   photography-first, tb.css, Newsreader or any of it. If it is not rewritten it
   will actively undo this on the next design task.
2. **`update:engine` will not deliver it.** The `ENGINE` list in
   `scripts/update-engine.mjs` covers `components`, `lib`, `scripts`,
   `app/globals.css`, `app/layout.tsx`, `app/page.tsx` and **not `app/tb.css`**.
   Every existing site would update and still look old. This is a one-line fix and
   an easy one to miss.
3. **"Title Case headings" versus "no bold headlines."** Both rules are live. They
   do not conflict but the combination needs stating once in the design skill.
4. **The `Bleed` background video I added to the local-service seed today** is
   superseded by `VideoBand` / `AutoVideo`. Drop mine.

## Three decisions I need from you

**1. Does the local-service seed get the identical look, or a sibling?**
The luxury-residence language is a strong fit for real estate. For a plumber or an
emergency dentist, rule 3 (text links, not buttons) fights the thing that page is
for: research says emergency pages convert on a large obvious phone number. My
recommendation is same system, one documented exception: **urgent CTAs stay solid
buttons on emergency and call-first pages.** Say if you would rather it be
identical everywhere.

**2. Accolades and other Krista-specific blocks: generalise or drop?**

**3. The sample registry for a brand-new site.** Ship a small generic starter per
archetype, or generate it at setup from the verified sourcing I built today? The
second gives a site its own local photography on day one; the first is instant and
offline. They combine well: starter ships, setup replaces.

## Order of work

1. Port the design layer to `realtor-site-seed`, since that is the one the
   reference was built from and the diff is smallest.
2. Screenshot the seed against `krista-mashore-site` side by side at 390 / 768 /
   1440, both themes, before claiming a match.
3. Rewrite `site-design-system/SKILL.md` to describe this system.
4. Add `app/tb.css` to the `ENGINE` list, write the changelog entry.
5. Port to `local-service-site-seed` with whatever exception you pick in (1).
6. Then the dentist site rebuilds itself off the new seed rather than being patched.
