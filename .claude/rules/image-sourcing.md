# Image sourcing rules

Referenced by `image-creator` (Krista's skill, copied verbatim) and by
`realtor-site-setup` Phase 2d. The working procedure lives in
**`.claude/skills/image-manager/SKILL.md` → "Sourcing"**; this file is the rule.

---

## 1. Where to look, in order — and ASK before you scrape

Stop at the first that works. The order matters: the earlier options are higher
quality, legally simpler, and faster than the later ones.

1. **Files already on their machine.** **Ask this first, every time, before
   anything else:**

   > "Before I go hunting — do you have photos saved on your computer? A folder
   > from a photographer, your phone's camera roll synced to the laptop, an old
   > marketing folder. If you point me at the folder I'll take it from there."

   Local originals beat every other source: full resolution, no compression
   artefacts, no licence ambiguity, and no guessing which of the images on a
   website were ever theirs. The same preference is already written down for
   blog posts ("prefer their files over scraping") and it applies at least as
   strongly here, because a web page serves images already downsized and
   recompressed for the web.

2. **Their existing website.** Only after asking about local files. Images on a
   site they own are usually theirs, but **"on their site" is not proof of
   ownership** — brokerages, IDX feeds, past photographers and stock libraries
   all end up there. Pull them as *candidates*, show the agent what you found,
   and ask which are theirs to use. See `.claude/rules/truth-verification.md`:
   harvested is a candidate, never a fact.

3. **Their other profiles.** Google Business Profile first — those photos are
   already theirs, already local, and already associated with the business in
   Google's eyes. Then Instagram, Facebook, Canva, the brokerage asset library,
   a photographer's delivery link.

4. **Properly-licensed free stock** — Unsplash, Pexels, Openverse. Verify the
   licence per image; commercial use must be permitted.

5. **Paid stock** the agent buys.

6. **AI-generated** — generic or abstract only (textures, backgrounds,
   concepts). `image-creator` writes the prompt; this repo does not generate or
   host images itself.

## 2. No empty frames. Fill every slot, then track what you filled.

**An agent with no photos must not end up looking at a site of grey gradients.**
They decide it looks unfinished, and they lose momentum before they ever see
what it will be. So when a slot has nothing for it, source stock and **place
it** rather than leaving a gap.

- **Fill every image slot**, not a representative few.
- **Duplicates are fine.** The same licensed photo in three places beats one
  photo and two empty frames. The job is letting them see the finished shape of
  the site, not winning an art direction award. Vary them where it is cheap to.
- **Match the region, not the address.** A California suburb for a California
  agent, not a Manhattan loft. On a location page the image should be
  *plausible* for that place — see §3 for the line it must not cross.
- **Never stock for a person.** No headshot, no team photo, ever. A face that is
  not theirs is the one image nobody forgives, and it is the one slot that stays
  empty.

## 3. The hard line, which filling slots does not bend

**Never present a stock or AI image as a real photo of a real place.** Not in
the image, the caption, the alt text, the filename, or the placement.

This is the rule that governs §2. A generic street scene on `/areas/brentwood`
is illustration and it is fine. That same image with alt text reading
"Downtown Brentwood" is a false statement about a real place, published by a
licensed professional. The image can stay; the claim cannot.

So on a location page a stand-in gets **descriptive** alt text — "a suburban
street on a clear morning" — never **locative** alt text. When a real local
photo is genuinely unavailable and the page needs to say something true about
the place, a map embed is the honest alternative.

**Their own photo always wins**, even a mediocre phone shot of a real street
they actually work. Stock is scaffolding, not the finish.

## 4. Mark a stand-in so it can be found again

Filling every slot removes the signal that anything was missing: the launch
gate's "N areas have no header image" warning goes quiet precisely because the
gaps are now covered. Without a marker, stock becomes permanent by accident.

So every stand-in is **placed under `public/images/stock/`**. That path is the
marker, it survives a renamed file and an unmaintained list, and
`npm run launch:check` counts what is still there and says so. It warns rather
than fails — launching with some stock is a legitimate choice — but it never
goes silent.

Also: put each one on `content/OPEN-ITEMS.md`, and **say plainly, in one line,
which images are stand-ins** when you hand the site back. Not buried:

> "The neighbourhood shots are licensed stock for now — send me your own and
> they'll look far better, because yours will actually be those streets."

## 5. Provenance

Every non-agent image gets a line in `public/images/CREDITS.md` — source and
licence — so nothing untraceable ever ships.

## Approved AI image tools

`image-creator` produces the *prompt*; the agent runs it in one of the free
tools that skill lists (Google Gemini/Imagen and the alternatives named there).
