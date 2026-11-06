# The shared engine

**Who this is for:** anyone changing a seed itself, or porting a change between
seeds. Not for an owner building their own site.

The site seeds share no parent repository. A feature reaches all of them by
being written once and applied to each, so the rule is:

- **The engine is byte-for-byte identical in every seed.** A fix is one diff,
  applied once per seed, and nobody has to read it more than once.
- **Everything that differs lives in a per-seed profile, behind a contract
  stated at the top of that file.** Adding a seed means writing the profiles
  and nothing else.

Copying a file sideways and editing it is how one industry's law ends up on
another industry's site.

## Two manifests, two relationships

| Manifest | Relationship | Who writes it |
|---|---|---|
| `ENGINE.sha256` | **The engine:** files identical across every seed. Identical in every seed, line for line. | The seeds, together: an engine change is made in all of them and re-hashed in each. |
| `SEED.sha256` | **Seed-managed:** every file *this* seed delivers to the sites made from it: the engine, plus the seed's own shared code (its gate, its launch check, its pages). Different per seed. | Each seed, from the `SEED_MANAGED` list in its `lib/seed-id.mjs`. |

Both are `shasum -a 256` format, one `sha256  path` line per file. Three things
read them:

| Reader | What it does |
|---|---|
| `npm run check:engine` (`scripts/check-engine.mjs`) | Verifies both. **On a seed** (the `origin` remote is the seed's `SEED_REPO`, or the gate's `is_template` flag is set) any mismatch fails, naming the file. **On a site** made from a seed the same mismatch is the owner's own edit, so it warns, names the files, says they won't be updated automatically, and the gate stays green. |
| `npm run update:engine` (`scripts/update-engine.mjs`) | Delivers exactly the files in the seed's `SEED.sha256` to a site, judging each against the site's own `SEED.sha256` (what it last received) so an owner's edit is kept, never overwritten. |
| `shasum -a 256 -c <manifest>` | The same check with no Node at all. |

## Changing the engine

1. Make the change in **every** seed, the same change.
2. In each seed, run `node scripts/check-engine.mjs --write`. That re-hashes
   `ENGINE.sha256` from the paths it lists and rebuilds `SEED.sha256`.
3. Compare the seeds' `ENGINE.sha256` files. They must be identical.
4. Adding a file to the engine: add its line in every seed, then re-hash.
   Removing one: delete its line in every seed.

A change that cannot be made identically in every seed is not an engine
change. It belongs in a profile.

## Changing what a seed delivers

A seed's own shared file (its gate, a page under `app/`) changed? Run
`node scripts/check-engine.mjs --write` in that seed only. To start delivering
a new folder, add it to `SEED_MANAGED` in `lib/seed-id.mjs` first.

## The profiles: what each seed holds for itself

| File | What it holds | Contract |
|---|---|---|
| `scripts/lib/article-profile.mjs` | Everything the daily writer does differently: what the business is, whether a post must name a town, the post shape, the rules it may not break, the blog card kicker | At the top of the file; `npm run check:profile` asserts it |
| `lib/seed-id.mjs` | `SEED_ID`, the publisher, `SEED_REPO` (where `update:engine` pulls from) and `SEED_MANAGED` (what it delivers) | Constants only, no imports: it is bundled for the browser |
| `scripts/compliance/packs/<industry>.mjs` | One industry's advertising rules, on top of `baseline.mjs` | The pack shape in `scripts/compliance/index.mjs` |
| `scripts/capabilities.mjs` | What `npm run catchup` checks for this kind of business | Its own header |
| `site.config.ts` | The site itself | Engine code reads it tolerantly: see `lib/brand-mark.ts` and `lib/tracking.ts` |

## The three seed shapes

| | `realtor-site-seed` | `local-service-site-seed` | `coaches-site-seed` |
|---|---|---|---|
| Who it is for | Real estate agents | Local service businesses: trades, shops, clinics | Coaches, consultants, course creators |
| Identity in `site.config.ts` | `agent{}` | `owner{}` | `owner{}` + `business{}` |
| Place | Always a town | Always a town | National by default; `location.city` may be empty |
| `requirePlaceInTitle` | `true` | `true` | `false` |
| Post shape | `sections[]` | `sections[]` | `sections[]` plus a `topic` slug |
| Blog card kicker (`cardKicker`) | The post's town, then the site's | The post's town, then the site's | The post's topic title |
| Industry law | Fair Housing and licensee rules, in its profile and launch check | The FTC plus an industry pack chosen by `business.businessType` | Earnings and testimonial claims, in `packs/coaching.mjs` |

## Not engine, deliberately

Design and audience files are each seed's own, even where two seeds happen to
match today: `components/ui.tsx`, `components/PageHero.tsx`,
`app/globals.css`, `app/page.tsx`, `site.config.ts`, `CLAUDE.md`, `README.md`,
`content/`, each seed's own skills, `scripts/launch-check.mjs`,
`scripts/capabilities.mjs` and `scripts/lib/article-profile.mjs`.
`content/posts-generated.json` is where the daily writer stores what it
publishes, so it belongs to the site, not the engine.

## The engine files (70)

### The daily article

- `.claude/rules/unattended-content.md`
- `.claude/skills/daily-articles/SKILL.md`
- `.github/workflows/daily-article.yml`
- `app/api/blog-card/[slug]/route.tsx`
- `public/fonts/Inter-400.ttf`
- `public/fonts/Inter-700.ttf`
- `scripts/daily-article.mjs`
- `scripts/lib/check-article.mjs`
- `scripts/lib/check-profile.mjs`
- `scripts/lib/write-article.mjs`
- `scripts/verify-published.mjs`

### Updating sites, and checking the engine

- `.claude/scripts/skills-update.sh`
- `.claude/settings.json`
- `docs/ENGINE.md`
- `scripts/check-engine.mjs`
- `scripts/update-engine.mjs`

### Compliance (the shared layer; industry packs are each seed's own)

- `scripts/compliance/index.mjs`
- `scripts/compliance/packs/baseline.mjs`

### Leads, tracking and the chat box

- `.github/workflows/report.yml`
- `app/api/lead/route.ts`
- `components/Analytics.tsx`
- `components/ChatWidget.tsx`
- `components/FunnelForm.tsx`
- `components/GuideView.tsx`
- `docs/CHAT-COSTS.md`
- `lib/attribution.ts`
- `lib/lead-mail.ts`
- `lib/ratelimit.ts`
- `lib/tracking.ts`
- `scripts/ghl-test.mjs`

### Identity, provenance and generated images

- `LICENSE.md`
- `app/icon.tsx`
- `app/opengraph-image.tsx`
- `components/BrandMark.tsx`
- `lib/brand-mark.ts`
- `lib/licence-id.mjs`
- `lib/site-url.ts`
- `next.config.mjs`
- `scripts/check-domain.mjs`
- `scripts/check-provenance.mjs`
- `scripts/site-id.mjs`

### Audits

- `.github/workflows/audit-history.yml`
- `scripts/audit-browser.mjs`
- `scripts/audit-compare.mjs`
- `scripts/audit-history.mjs`
- `scripts/site-routes.mjs`
- `scripts/vercel-build.mjs`

### Shared skills

- `.claude/skills/catch-up/SKILL.md`
- `.claude/skills/content-engine-builder/SHIPPED-FROM.md`
- `.claude/skills/copywriter/SHIPPED-FROM.md`
- `.claude/skills/hooks/SHIPPED-FROM.md`
- `.claude/skills/image-creator/SHIPPED-FROM.md`
- `.claude/skills/secrets-setup/SKILL.md`

### Shared components, pages and build config

- `app/api/routes/route.ts`
- `app/not-found.tsx`
- `app/privacy/page.tsx`
- `app/terms/page.tsx`
- `components/Icons.tsx`
- `components/JsonLd.tsx`
- `components/ScaffoldBanner.tsx`
- `components/ShowMore.tsx`
- `components/ThemeToggle.tsx`
- `lib/related-posts.ts`
- `lib/unfilled.ts`
- `postcss.config.mjs`
- `public/fonts/Fraunces-latin.woff2`
- `public/fonts/Inter-latin.woff2`
- `public/fonts/LICENSE.md`
- `public/images/CREDITS.md`
- `tailwind.config.ts`
- `tsconfig.json`
