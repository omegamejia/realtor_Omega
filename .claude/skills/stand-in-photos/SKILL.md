---
name: stand-in-photos
description: >-
  Search for, screen and place licensed stock photos chosen for THIS business:
  its type, each page's subject, and its location. Replaces the seed's generic
  photos during setup, before the owner first sees the site, and fills any new
  page's photo. Use when setup reaches the business type, when someone says
  "the photos don't fit", "pick better photos", "these photos look generic",
  "find photos for my site", or when `npm run check:photos` reports the seed's
  generic photos still in place.
model: sonnet
---

# Stand-in photos: chosen for this business and this place

The seed ships a few generic photos so a fresh copy is never blank. **They know
nothing about the business.** An office photo on a health coach's site, or a
New England colonial on a Phoenix realtor's, tells the owner the site is not
theirs. So as soon as setup knows what the business is and where, every one of
them is replaced with a photo chosen for it. That happens **before the owner
first sees the site**, and it is done, not offered.

Their own photos always win. This skill fills the slots they have not sent yet,
and the setup and image-manager skills swap in their real ones as they arrive.

SHARED ENGINE: this file is byte-identical in every seed. Where a seed differs
(which pages carry a photo, what each page is about), it says so in its own
setup skill and in `lib/photo-slots.ts`.

## 1. List the slots

```bash
npm run check:photos -- --list
```

Every page header that shows a photo, the photo in it now, and its kind:
`seed default` (replace), `stand-in` (chosen for this business already) or
`own`. Work through every `seed default`. A slot that falls back to the
site-wide photo still deserves its own when its page has a distinct subject.

## 2. Write the search for each slot

Three inputs, from `site.config.ts` and what the owner said:

| Input | Where it comes from | Example |
|---|---|---|
| **The business** | What they do, as a customer would say it | leadership coach for first-time managers; plumber; residential realtor |
| **The page's subject** | That page's title and summary | delegation; drain cleaning; first-time buyers; downsizing |
| **The place** | City and region, when they serve one (local mode, every realtor, every local service) | Phoenix, Arizona; Portland, Maine; the Texas Hill Country |

Turn the place into **what it looks like**, never its name: the architecture
(adobe and stucco, brick colonial, ranch, craftsman bungalow, beach cottage),
the landscape (desert, pine forest, prairie, coast, mountains), the plants
(palms, saguaro, maples, live oaks) and the light and season it usually has.
Search for those words, not for the town.

Good searches, one per slot:

- Home page, plumber in Phoenix: `stucco house desert landscaping`
- Service page, same plumber, drain cleaning: `clean kitchen sink`
- Home page, realtor in Portland, Maine: `new england colonial house`
- Area page, same realtor: `tree lined street brick houses autumn`
- Program page, health coach: `healthy breakfast table morning light`
- Topic page, leadership coach, hard conversations: `two coffee cups table meeting`

**Show the finished result, never the problem.** A burst pipe, a messy room, a
cracked roof or a stressed face says the wrong thing on the page that sells the
fix. Choose what the customer gets.

## 3. Search licensed stock

In order: **Unsplash**, then **Pexels**, then **Pixabay**. Commercial use must be
allowed with no attribution trap.

- Unsplash search, free photos only, landscape:
  `https://unsplash.com/s/photos/<words-joined-by-hyphens>?license=free&orientation=landscape`
- Before using one, open its photo page and confirm the title says **"Free Photo
  on Unsplash"** and the page does not mention **"Unsplash+ License"** (that one
  is paid).
- The full-size file: `https://images.unsplash.com/photo-<id>?w=1920&q=78&fm=jpg&fit=max`

Pull **three or four candidates per slot**. Most get rejected in step 4.

Download into a new, empty scratch folder of their own, never into the site.

## 4. Screen every candidate, by eye

```bash
node scripts/stand-in-photos.mjs sheet <scratch folder>
```

Look at the sheet. Reject the photo if **any** of these is true:

- A recognizable **face**, or any person who could read as the owner, a client or
  a customer. Hands at work are fine.
- A **logo, brand name or branded product**: a laptop's logo, a mixer, power
  tools, a labelled bottle, a printed pen.
- **Artwork, a poster or a printed graphic** on the wall or on a cushion.
- A **landmark**, a famous building, a **readable house number**, a street sign or
  a business sign.
- **The problem instead of the result** (step 2).
- **It does not look like the place**: palm trees for a Minnesota realtor, snow for
  Miami.

Small things hide on a sheet. Crop and look whenever there is a product, a
door, a label or text:

```bash
node scripts/stand-in-photos.mjs crop <file> 0.6 0.3 0.3 0.4
```

The four numbers are left, top, width and height, as fractions of the photo.

## 5. Place and wire

```bash
node scripts/stand-in-photos.mjs place <file> <short-name> <photo page URL>
```

It resizes to 1600px wide, saves `public/images/stock/<short-name>.jpg` and adds
the credit line to `public/images/stock/CREDITS.md`. Then set the printed path on
the slot in `site.config.ts` (`heroImageUrl`, `breakImageUrl`, or that page's
`heroImage`). Never on a headshot.

**Never let placement claim a place.** A stand-in may look like the region; it
may never be presented as a real photo of the town, a neighborhood, a client or
the owner's work. No caption or alt text naming a real place, person or job.
See `.claude/rules/image-sourcing.md`.

## 6. Prove it

```bash
npm run check:photos
```

It must report **0 on the seed's generic photos**. Then look at the pages: the
home page and two others at phone and desktop width. Wrong feel is a reason to
go back to step 2, before the owner sees it.

**Tell the owner in one line**, once the site is in front of them: *"The photos
are licensed stock picked for your business for now. Send me your own whenever
you have them and I'll swap them in."*

## Never

- Leave a seed default in place once the business type is known.
- Use a stock face for anyone, or a stock photo as the owner's work, a client, or
  a real place in their town.
- Use an image whose licence you have not confirmed on its own page.
- Empty a slot. A photo that is merely fine beats no photo.
