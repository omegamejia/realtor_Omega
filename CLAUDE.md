# realtor-site-seed — how Claude runs this project

## What this is

This repo is a real-estate agent website **seed**. One clone = one agent's real
site. It ships as placeholders (`site.config.ts` full of `[BRACKETS]`,
`launchReady: false`, and scaffolded content pages) until the owning agent's
real information is filled in. Claude drives the setup, the writing, and the
ongoing maintenance — the agent owns the repo, the Vercel project, and the
domain; nothing here is a black-box platform.

## Session start — check this before anything else

At the start of a session in this repo, work out which of three states the site
is in. Each one opens differently, and opening the wrong way is the mistake this
step exists to prevent: restarting an interview somebody already half-finished,
or interviewing a team member as though they were the agent.

1. **Work out the state.** Open `site.config.ts` and look for
   `content/SETUP-PROGRESS.md`.

   | State | How to tell | Open with |
   |---|---|---|
   | **Brand new** | `launchReady` is `false`, the `agent`, `business` or `location` sections still hold `[BRACKETS]`, and there is no progress file | The setup interview (step 2) |
   | **Partway through setup** | `launchReady` is `false` and the progress file exists, **or** the config is filled in but the site has not launched | Where things stand (step 4) |
   | **Live** | `launchReady` is `true` | Normal operation (step 5) |

2. **Brand new: start setup yourself.** Unless the user has already opened with
   something setup-related, **say so and start the `realtor-site-setup`
   interview.** Don't wait for the agent to know to say "set up my site." A fresh
   clone should feel like Claude already knows what this is and what happens
   next, not like a blank prompt waiting for the right magic words.

   **But if they opened by naming a specific job, do that job first.** "Set up my
   tracking", "add a listing", "connect my CRM" — route to the skill in the table
   below and finish what they asked for. Mention once, at the end, that the rest
   of the site is unbuilt; do not fold their request into a clause of the setup
   interview. A person who arrives with a task and is handed an interview instead
   has to argue their way back to the thing they came for, and in testing that
   cost five turns and most of the session before the right skill ever loaded.
   The opener wins, every time. Starting setup yourself is for a **blank** opener.

   Walk `realtor-site-setup/SKILL.md` in phase order. It opens with **Phase 0
   orientation** (a scripted opener) and **Phase 1 discovery**. The first
   question is *"do you already have a website?"*, and the second is whether
   they have Krista's Agent-OS — in that order, because not every agent owns
   Agent-OS and leading with it opens on a term they may have to ask about. The
   third is **where they want to start**: the whole site, or their listings and
   AI phone assistant first. The skill's **Starting points** section covers both.
   Most agents are not starting from zero: **harvest what they already have
   (site, files, photos, old blog posts) before interrogating them.** Never
   write harvested data without the agent confirming it.
3. Accounts (GitHub/Vercel) run as a **parallel track** — start them early and
   let them progress alongside discovery. They only truly block *deploy*.
4. **Partway through: pick up, never start over.** Read
   `content/SETUP-PROGRESS.md` and `content/OPEN-ITEMS.md`, then say in two or
   three plain lines what is done and what comes next, and ask:

   > "Your listings and phone assistant are working. The pages aren't written
   > yet, so the site is still hidden from Google. Want to pick up there?"

   Never re-ask anything already confirmed; it is in the config.

   **The person in the chair may not be the one who started.** A team member or
   an assistant helping out is common. If they came to do something other than
   setup, do that, and mention once that setup is unfinished.

   A site that is filled in with no progress file was started before the file
   existed. Read the config, run `npm run gate` to see what is still an outline,
   write the progress file from what you find, and tell them what you found.
5. **Live: normal operation.** Use the skill routing table below.
6. **Check whether the engine has updates, but only on a site that is set up.**
   Run `npm run update:engine` (the bare command is a preview and changes
   nothing). A site generated from the template has no git link back to the seed,
   so improvements to schema, SEO rules, the design system and the launch gate
   reach them only when somebody runs this. Nobody wakes up wanting to.

   **Never apply an update without asking.** An engine update can add a *rule*,
   and a rule lands on content they already wrote. The order is always:

   1. **Say what changed, in their language.** `docs/ENGINE-CHANGELOG.md` is
      written for that — entries tagged `content` or `decision` are the ones that
      involve them. "There's a new check that makes sure your page headings match
      their web addresses" beats a list of file paths.
   2. **Say what it would mean for their site.** The preview reports any engine
      file they have customised that would be overwritten. If an entry is tagged
      `content`, tell them it may flag existing pages *before* they apply, not
      after.
   3. **Ask.** They may want it now, later, or not at all. All three are fine.
   4. **A site on an older engine needs the update applied twice, with a commit
      in between.** The first pass runs the *old* updater, and the list of what
      counts as engine has grown since — `.github/workflows` was added to it — so
      pass one installs the new updater but not the automated jobs it knows
      about. The agent is told the update finished and has no Monday report job.

      **The commit is not optional.** A second `update:engine` immediately after
      the first stops with *"You have uncommitted changes"* and does nothing,
      because applying stages everything. The sequence that actually works,
      verified on a real old clone:

      ```bash
      npm run update:engine -- --apply
      git add -A
      git commit -m "chore: pull latest engine"
      npm run update:engine -- --apply
      ```

      Say "that's expected" before the second pass, so it does not look like the
      first one failed. Then run the gate.

   5. **If they apply it, run the gate with them** and read the result together.
      A new rule flagging an old page is the gate working, not the update
      breaking their site — say that explicitly, because it does not look that
      way to someone who just ran an update and now sees failures.
   6. **Never fix flagged content silently.** Show them what it caught, explain
      why it matters (usually ranking or compliance), and let them choose.

   Mention it once. If they say not now, drop it for the session.

7. **Then check `content/OPEN-ITEMS.md`.** Images are the item most worth
   raising, because a missing photo falls back to a gradient and therefore never
   looks wrong. Ask for a few, not all of them. Setup writes it with everything left
   unconfirmed, unfound, or postponed. If anything is still open, mention it once,
   framed as upside rather than a chore — *"two things still open from setup that
   would help your ranking"* — and let them decide. Don't nag, don't repeat it
   later in the same session, and stop asking about anything marked declined.

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
| "set up my AI caller," "the voice agent doesn't know my listings," "my AI says it has no listings," "connect my knowledge base" | `voice-agent` |
| "my site is on WordPress and I only want the AI caller," "I don't want a website, just the phone assistant" | `voice-agent` → its **knowledge-base-only route**. Never offer that route first; it is for someone who has already turned the site down |
| "keep my listings updated," "did anything close," "check for new listings," a recurring listings check | `listings-routine` |
| "add my headshot," "here's my logo," "add photos to this listing" | `image-manager` |
| "add a lead magnet," "build a funnel," "landing page," "opt-in," "event signup," "sales funnel," "seller guide" | `funnel-builder` |
| "connect GHL," "wire up the CRM," "set up custom fields," "the form isn't reaching GoHighLevel," "test the GHL connection" | `ghl-integration` |
| "set up tracking," "add a pixel," "add heatmaps," "set up my reporting," "how did my site do," "walk me through this week's report," "why aren't my ads working" | `reporting` |
| "buy a domain," "connect my domain," "migrate my site" | `domain-setup` |
| "change the design," "update the look," "add a new page type/component," "review this before it ships," "what's our design system" | `site-design-system` |
| "the process page," "how we sell," "our method," deep links into `/process` | `realtor-content-writer` (words) + `site-design-system` (structure) |

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

## When the agent hits a problem

`docs/TROUBLESHOOTING.md` covers the predictable stalls (port in use, Node missing,
`npm install` failing, stale preview, Vercel build failure, chat/CRM not connected)
in beginner language. **Consult it before improvising an explanation**, so every
agent gets the same known-good fix rather than whatever you reason out that day.

If they paste an error, read it, fix it, and tell them plainly what happened. Never
say "just" — nothing is *just* anything to someone doing it the first time.

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

## Connect first, then do it for them (applies to every external service)

**Never narrate clicks at somebody when you could do the thing yourself.** Reading
a dashboard aloud — *"press the green button, now scroll down, now name it"* — to
someone who has never seen that screen is where setups stall, because they
mis-click and land somewhere you cannot see.

The order is always: **they authorize once → you do the work.**

- **Check what you already have first.** `gh auth status`, `vercel whoami`, or an
  existing connector. If you are already connected, say so and get on with it.
- **If not, ask for one authorization**, framed plainly: *"this is you telling
  GitHub it's okay for me to work on your files — you can revoke it any time."*
  `gh auth login` and `vercel login` both take one browser click.
- **Install for them too, don't send them shopping.** Check with `node --version`,
  `gh --version` and friends, then install whatever is missing. Use the routes that
  need no admin rights (Homebrew, winget, or nvm into their home directory) —
  never an installer that demands a password. Say what you're installing and why
  before the prompt appears, so it isn't a scary surprise.
- **Only three things genuinely require them:** creating an account, entering a
  payment method, and typing their own password if one is ever truly unavoidable.
  Never ask for a password, and never type one on their behalf.
- **Manual clicking is the fallback, not the plan.** If connecting fails, say why
  before switching, so it reads as a workaround: *"the shortcut isn't cooperating,
  so we'll do this one by hand."*

This holds for GitHub, Vercel, and anything added later.

## Hard rules (apply everywhere, every skill)

- **Never fabricate.** Not a stat, review, license number, award, or fact the
  agent hasn't confirmed. A blank or a `[PLACEHOLDER: ...]` marker is always
  better than a realistic-sounding guess. This is the single rule every skill
  in this repo restates — take it seriously.
- **Never assert what nobody confirmed.** Harvested data is a candidate, not a
  fact; a seed default is not an answer. `.claude/rules/truth-verification.md` is
  the full rule — provenance, the higher bar for name/address/phone, and why an
  empty field beats a plausible one. It governs data the way
  `legal-compliance.md` governs claims.
- **Never sweep a place name site-wide.** A sentence about where the *business*
  works is branding and may change; a sentence about where a *town* is is a fact
  and stays. If a URL names a place its `<h1>` must name the same place, and the
  gate enforces that. `.claude/rules/geographic-branding.md` is the full rule —
  which fields widen, why keywords are never swept, and the contradictions that
  appear when a service area grows.
- **Never hand-write JSON-LD.** All schema is generated by `lib/schema.ts`
  from `site.config.ts` + page content. If a page needs different schema, fix
  the config or content, not the markup.
- **Never set `launchReady: true` while `npm run launch:check` fails.** That
  flag is the human sign-off that everything in the config and content is
  real and confirmed — it's not a build switch.
- **Look at it before calling it done.** Open any visual change at 390, 768,
  1100, 1440 and 1600, in both themes, and drive the interactive parts. The gate
  reads HTML and cannot see a wrapped nav or an invisible button.
- **`site-design-system` is the finish line.** Whenever `realtor-content-writer`,
  `listings-manager`, `funnel-builder`, or `krista-aeo-geo-writer` finishes
  producing content, run
  `site-design-system`'s gate check (`npm run validate:schema` +
  `npm run launch:check` against a running `npm run dev`) before calling the
  work done. "Looks right" is not the bar — a clean gate run is.
