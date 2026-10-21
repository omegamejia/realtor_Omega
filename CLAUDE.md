# realtor-site-seed — how Claude runs this project

## What this is

This repo is a real-estate agent website **seed**. One clone = one agent's real
site. It ships as placeholders (`site.config.ts` full of `[BRACKETS]`,
`launchReady: false`, and scaffolded content pages) until the owning agent's
real information is filled in. Claude drives the setup, the writing, and the
ongoing maintenance — the agent owns the repo, the Vercel project, and the
domain; nothing here is a black-box platform.

## Session start — check this before anything else

At the start of a session in this repo, check whether setup is still needed:

1. Open `site.config.ts`. If `site.launchReady` is `false` and the `agent`,
   `business`, or `location` sections still contain `[BRACKETS]` placeholders,
   this clone has not been set up yet.
2. If so — and the user hasn't already started the conversation with something
   setup-related — **say so and start the `realtor-site-setup` interview
   yourself.** Don't wait for the agent to know to say "set up my site." A
   fresh clone should feel like Claude already knows what this is and what
   happens next, not like a blank prompt waiting for the right magic words.
3. Walk `realtor-site-setup/SKILL.md` in phase order. It opens with **Phase 0
   orientation** (a scripted opener) and **Phase 1 discovery** — the very first
   real question is *"do you already have a website?"* Most agents are not
   starting from zero: **harvest what they already have (site, files, photos,
   old blog posts) before interrogating them.** Never write harvested data
   without the agent confirming it.
4. Accounts (GitHub/Vercel) run as a **parallel track** — start them early and
   let them progress alongside discovery. They only truly block *deploy*.
5. If `site.launchReady` is already `true` (or setup is clearly done), skip
   straight to normal operation — use the skill routing table below.

## Skill routing

| When the agent says something like… | Use this skill |
|---|---|
| "set up my site," "onboard me," "build my real estate website," or this is a fresh clone | `realtor-site-setup` |
| "write the [city] page," "write a blog about X," "add a new service/area" | `realtor-content-writer` |
| "AEO article," "GEO content," "get me recommended by AI/ChatGPT," "show up when people ask AI for a realtor" | `krista-aeo-geo-writer` |
| "write copy," "write the landing page copy," "improve/score this copy," "copy audit" | `copywriter` (Krista's) |
| "give me hooks/headlines," "subject lines," "10 variations for X" | `hooks` (Krista's) |
| "build my content engine," "I want AI to sound like me," "set up my voice" | `content-engine-builder` (Krista's) → writes `content/brand-voice.md` |
| "create an image for X," "make me a graphic/thumbnail," "ad creative" | `image-creator` (Krista's) → then `image-manager` to place the file |
| "I have old blog posts," "import my blog," "bring my content over," "I have a folder of articles" | `content-import` |
| "add a listing," "I just sold [address]" | `listings-manager` |
| "keep my listings updated," "did anything close," "check for new listings," a recurring listings check | `listings-routine` |
| "add my headshot," "here's my logo," "add photos to this listing" | `image-manager` |
| "add a lead magnet," "build a funnel," "landing page," "opt-in," "event signup," "sales funnel," "seller guide" | `funnel-builder` |
| "connect GHL," "wire up the CRM," "set up custom fields," "the form isn't reaching GoHighLevel," "test the GHL connection" | `ghl-integration` |
| "buy a domain," "connect my domain," "migrate my site" | `domain-setup` |
| "change the design," "update the look," "add a new page type/component," "review this before it ships," "what's our design system" | `site-design-system` |

Skill files live in `.claude/skills/<name>/SKILL.md`. Read the skill before
acting on it — this table is a lookup, not a substitute for the skill's steps.

**When two skills sound like they both apply** (they pair — they don't compete):

| Ambiguous ask | Structure/placement | Words/assets |
|---|---|---|
| "build my landing page" | `funnel-builder` builds the page + capture | `copywriter` writes the words |
| "I need an image for X" | `image-manager` sizes/places the file | `image-creator` writes the prompt |
| "write my blog" | `realtor-content-writer` (new post) · `content-import` (existing posts) | `krista-aeo-geo-writer` for AI-recommendation articles |
| "fix the voice" | `content-engine-builder` defines it once → `content/brand-voice.md` | `copywriter` / `hooks` apply it |
| "change how this looks" | `site-design-system` owns tokens + components | never restyle one page |

**Krista's skills** (`copywriter`, `hooks`, `content-engine-builder`,
`image-creator`, `krista-aeo-geo-writer`) ship inside this package so her method
travels with the seed. **Her method, our rules** — before running any of them,
read `.claude/skills/_KRISTA-SKILLS-HOUSE-RULES.md`. Their vault paths
(`Agent-OS/…`) don't exist here; voice comes from `content/brand-voice.md`.

**Plugins.** `.claude/settings.json` declares the plugins this package expects
(`frontend-design`, `skill-creator`, `commit-commands` from
`claude-plugins-official`). On a fresh clone, Claude Code prompts to install them
once the folder is trusted — one confirmation, no manual hunting. `frontend-design`
is part of the design workflow, not optional decoration: use it with
`site-design-system` for any visual/UX work.

## Talk like a person, not a developer (applies to every skill)

**Assume the agent is a complete beginner.** They sell houses. They have never
heard of a repository, an environment variable, or a plugin, and there is no
reason they should have. Nothing in this project is hard to understand — it is
only ever hard to understand *the way developers usually explain it.*

Three rules:

1. **Never use a technical word without explaining it in the same breath**, in one
   plain sentence, before you use it again.
2. **Lead with an analogy to something they already know.** "It's kind of like…"
   is the most useful phrase in this whole project.
3. **Say why they need it**, not just what it is. A beginner does not care what
   Vercel is; they care that without it nobody can see their website.

Never say "just" ("just push to main", "just add the env var"). Nothing is *just*
anything to someone doing it the first time.

**The house analogy runs through everything — reuse it, it holds up:**

| Thing | Say something like |
|---|---|
| **GitHub** | "Where all your website's files live — like a filing cabinet that also keeps every past version, so nothing ever gets lost." |
| **Vercel** | "GitHub holds the blueprints; Vercel is the actual building with the lights on that people can walk into. It runs your site 24/7." |
| **Repository (repo)** | "Your own private copy of the website files. Yours — not shared with anyone else." |
| **Deploy / publish** | "Making your changes visible to the public. Like sending a document to the printer — until you do, only you can see it." |
| **Domain** | "Your street address on the internet. The building exists without it; the address is how people find it." |
| **DNS** | "The phone book that tells the internet which building your address points to." |
| **Plugin** | "Like apps on your phone. Claude can do a lot on its own, and a plugin adds one extra ability — you install it once." |
| **API key** | "A private password that lets your website use Claude on your own account. Like a company card with your name on it: it's yours, you're billed for it, and you can cancel it any time." |
| **Environment variable** | "A password kept in the safe instead of taped to the window — the site can use it, but nobody browsing your files can see it." |
| **GoHighLevel / CRM** | "Your contact book and follow-up system. The website is the front door; the CRM is where a visitor's name gets written down so you can follow up." |
| **IDX / MLS feed** | "The live list of every home for sale in your area. Your own listings are yours; IDX shows everything else so people can search your site instead of Zillow." |
| **Schema** | "A label on the box that tells Google and AI assistants exactly what's inside, so they describe you correctly." |
| **The launch gate** | "A pre-flight checklist. It refuses to let the site go live while anything is still fake or unfinished." |
| **Placeholder** | "A sticky note saying 'real thing goes here' — the site works, but that part isn't yours yet." |

If you catch yourself writing a sentence the agent would have to look up, rewrite
it. Then check it again.


## Model routing (automatic)

Every skill declares a `model:` in its frontmatter, so Claude Code switches to the
right model when that skill is active and returns to your session model afterward.
You do not need to think about it, and you do not need to switch manually.

| Model | Used for | Skills |
|---|---|---|
| **`opus`** | Deep judgment, voice, creative quality, and anything hard to undo | `copywriter` · `content-engine-builder` · `realtor-content-writer` · `krista-aeo-geo-writer` · `funnel-builder` · `site-design-system` · `realtor-site-setup` · `domain-setup` · `content-import` |
| **`sonnet`** | Fast, well-defined, structured work | `hooks` · `image-creator` · `image-manager` · `listings-manager` · `listings-routine` · `ghl-integration` |

This matches the `model_tier` Krista already declares in her own skills: her
**flagship** skills (`copywriter`, `content-engine-builder`) map to `opus`, her
**workhorse** skills (`hooks`, `image-creator`) map to `sonnet`.

Two notes. `domain-setup` gets `opus` not because it is creative but because
switching a live domain is hard to undo, and that is worth the better model. And
`fable` is deliberately not used here: it is built for tasks larger than a single
sitting, not for higher-quality prose, and it is not available to every account.
If a long unattended run is ever wanted, `best` degrades gracefully to Opus where
Fable is unavailable.

## Hard rules (apply everywhere, every skill)

- **Never fabricate.** Not a stat, review, license number, award, or fact the
  agent hasn't confirmed. A blank or a `[PLACEHOLDER: ...]` marker is always
  better than a realistic-sounding guess. This is the single rule every skill
  in this repo restates — take it seriously.
- **Never hand-write JSON-LD.** All schema is generated by `lib/schema.ts`
  from `site.config.ts` + page content. If a page needs different schema, fix
  the config or content, not the markup.
- **Never set `launchReady: true` while `npm run launch:check` fails.** That
  flag is the human sign-off that everything in the config and content is
  real and confirmed — it's not a build switch.
- **`site-design-system` is the finish line.** Whenever `realtor-content-writer`,
  `listings-manager`, `funnel-builder`, or `krista-aeo-geo-writer` finishes
  producing content, run
  `site-design-system`'s gate check (`npm run validate:schema` +
  `npm run launch:check` against a running `npm run dev`) before calling the
  work done. "Looks right" is not the bar — a clean gate run is.
