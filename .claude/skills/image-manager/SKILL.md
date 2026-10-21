---
name: image-manager
description: >-
  Handle the agent's images — headshots, logo, listing photos, neighborhood
  photos, hero/brand images. Copy them into the site, size them for the web, and
  wire the paths. Use when someone says "add my headshot", "here's my logo", "add
  photos to this listing", "use this image", "here are my photos", or points at an
  image file on their computer.
# fast, well-defined, structured work
model: sonnet
---

# Image Manager

Images are hosted RIGHT HERE, in the repo's `public/images/` folder. They deploy with
the site and Vercel serves them. No external host, no account, no keys — the agent
owns them and they're backed up in git and on their machine.

## Add an image

1. **Get the file.** The agent gives you a path on their computer, or drops files in
   `public/images/inbox/`.
2. **Resize + compress for the web** before saving (keeps the repo lean and pages
   fast). Target ~1600px wide for photos, square for logos/headshots, well under a
   few hundred KB. **Use the cross-platform option first** — agents are on Windows
   as often as macOS:
   - **Any OS:** `npx --yes sharp-cli -i in.jpg -o out.jpg resize 1600`
   - macOS only, if `npx` is unavailable: `sips --resampleWidth 1600 in.jpg --out out.jpg`

   Never commit a raw multi-MB phone photo. If neither tool is available, say so
   and place the original rather than silently shipping a 12MB image — `next/image`
   will still serve a resized version, it just costs more bandwidth.
3. **Save to the right folder** with a lowercase, hyphenated name:
   - Headshots → `public/images/team/<member-slug>.jpg`
   - Logo → `public/images/brand/logo.png` ; office/brand photo → `public/images/brand/office.jpg`
   - Listing photos → `public/images/listings/<listing-slug>.jpg`
   - Neighborhood photos → `public/images/areas/<area-slug>.jpg`
4. **Wire the path** (always `/images/<folder>/<file>`, a root-relative path):
   - Team member `photoUrl`, business `logoUrl` / `imageUrl`, `agent.photoUrl`,
     listing `imageUrl`.
5. **Commit and deploy.** Clean up `public/images/inbox/` when done.

## Sourcing — when the agent doesn't have the photo

Agents often lack neighborhood/area photos. Work **down** this ladder and stop at
the first option that works. Never skip ahead.

1. **Files on their own machine. Ask for a folder BEFORE anything else.** This
   is the step that gets skipped and it costs the best version of every image:
   local originals are full resolution, free of web compression, and
   unambiguous about ownership. *"Do you have photos saved on your computer — a
   photographer's folder, your camera roll, an old marketing folder?"*
2. **Their existing website**, second. Obvious, and usually already open. But
   **"it is on their site" is not proof it is theirs** — brokerage assets, IDX
   photos, a past photographer's work and plain stock all end up there. Treat
   what you pull as candidates and ask which they own.
3. **Their other photos.** Google Business Profile first (already theirs,
   already local, already tied to the business in Google's eyes), then
   Instagram, Facebook, Canva, the brokerage asset library, a photographer's
   delivery link. Most agents have area shots on their phone and forget.
4. **Properly-licensed free stock** (Unsplash, Pexels, Openverse) — commercial-use
   OK, no attribution trap. Verify the license per image, and prefer generic
   scenery over anything that implies a specific place it isn't.
5. **Paid stock** the agent buys, if the budget exists.
6. **AI-generated** — only for clearly generic or abstract imagery (textures,
   backgrounds, illustrative concepts). Generate the prompt with `image-creator`.

**The hard line: never present an image as a real photo of a real place unless it
is one.** Do not caption, alt-text, filename, or place a stock or AI image so a
visitor would reasonably believe it's that agent's neighborhood, office, or
listing. On a real-estate site that's a trust problem and potentially a compliance
one — it's the same "never fabricate" rule that governs stats and reviews.

**Do not leave the slot empty.** An agent looking at grey gradients decides the
site is unfinished and loses momentum, so fill every slot — duplicates are fine,
and the same licensed photo in three places beats one photo and two empty frames.
The exception is a FACE: never stock for a headshot or a team photo, ever.

Put every stand-in under `public/images/stock/`. That path is what keeps them
findable after filling the gaps silences the gate's "N areas have no header
image" warning; `npm run launch:check` counts what is left (Layer 13) and fails
only on the dangerous case — a stand-in whose ALT TEXT names a real place. A
stock photo may illustrate a location page; it may not claim to be that place.
Use descriptive alt text, or a map embed where the page needs a true statement
about somewhere real. Say plainly which images are stand-ins so they get replaced.

**Record provenance.** For every non-agent image, note the source and license in
the commit message or a short line in `public/images/CREDITS.md`, so nothing
untraceable ever ships.

## Rules

- Always resize before committing. A lean repo deploys fast and stays fast.
- Descriptive, lowercase, hyphenated filenames.
- Only use images the agent has the right to use — their own photos, licensed, or the
  brokerage's assets. Never scrape random images off the web.
- Root-relative paths only (`/images/...`), so they work on any domain the site runs on.

## External hosting (rare — usually not needed)

For the site's own curated images (headshots, logo, area and featured-listing photos),
the repo is the simplest, cheapest, most durable home. Only reach for a dedicated image
CDN or the IDX/MLS feed if the agent has hundreds of large photos beyond curated
marketing images — that scale is what the MLS/IDX feed is for, not the site repo.
