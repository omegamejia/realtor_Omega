# Your Real Estate Website

This is a complete website for your real estate business. It is not a template you
fill in by hand. You talk to Claude, it asks you about your business, and it builds
the site with you. Then it keeps working on it: new pages, new listings, blog
posts, updates, for as long as you want.

**You do not need to know anything technical.** If you can answer questions about
your own business, you can do this.

---

## You own all of it

This matters, so it is worth saying before anything else.

Most agent websites are rented. You pay a monthly fee, someone else holds the keys,
and if you ever leave you lose the site, the content, and usually the search
rankings you spent years building.

**This one is yours.** Your accounts, your domain, your files, your content. Nobody
can switch it off, raise your rent, or hold it hostage. If you never speak to KMC
again, your website keeps running exactly as it is.

That does mean you pay for the pieces directly, with your own card:

| What | Roughly | Why you need it |
|---|---|---|
| GitHub | **Free** | Where your website's files live. Like a filing cabinet that also keeps every past version, so nothing is ever lost. |
| Vercel (Pro) | **~$20/month** | The building with the lights on. It runs your site 24/7 so people can visit it. Pro is required because the free plan is not licensed for business use. |
| Claude API key | **usage-based, small** | Powers the chat bubble that answers visitor questions from your real content. You are billed only for what it uses. |
| A domain name | **~$15/year** | Your address on the internet, like yourname.com. You may already have one. |

Call it roughly **$25–40 a month**, all in your name. That is an investment in an
asset you own, not a subscription to something you are renting.

---

## START HERE

Follow these in order. Each step needs the one before it. If anything goes wrong,
see **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** — the five most common
stumbles are all in there with fixes.

### 1. Create a GitHub account · free · 2 minutes

Go to [github.com](https://github.com) and sign up. It is an email and a password,
like signing up for anything else. There is nothing to install.

*This is where your website's files will live.*

### 2. Install Claude Code · 5 minutes · one time only

[claude.com/code](https://claude.com/code). Install it like any other app.

That is the only thing you need to go download. Your site needs a couple of other
small tools underneath, but Claude checks for those and installs whatever is
missing — you do not have to know what they are or pick the right version.

> You may see a prompt asking to allow one of those tools to install. That is
> expected, and Claude will tell you what it is before it happens.

### 3. Open Claude and let it do the setup · 5 minutes

Open Claude Code — any folder is fine for now, it will make the right one for you.

Then say:

> **"Set up my real estate website."**

Claude will check your computer for the few small tools your site needs, install
anything missing, and then ask permission to connect to your GitHub account.
**Say yes.** It opens a page where you press one button, and that is the whole
thing.

*What you just did: told GitHub it is okay for Claude to work on your files. Like
adding an assistant to your account — and you can remove that permission any time
you want.*

From there Claude does the parts that used to be yours to click through: it makes
your own private copy of the website, puts it on your computer, and opens it. You
do not need to visit github.com, name a repository, or copy a folder path.

> **Nothing here touches your money or your passwords.** Claude never asks for a
> password, and the only thing you ever pay for is your own hosting later on.

> **Doing it by hand instead.** If the connection will not cooperate, you can still
> do this the manual way — open the template on github.com, click **"Use this
> template" → Create a new repository**, then clone it with
> [GitHub Desktop](https://desktop.github.com) (**File → Clone repository**) and
> open that folder in Claude Code. It works exactly the same, it is just more
> steps. [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) walks through it.

> **No access to the template?** That one is not something Claude can work around —
> ask KMC to invite you, then accept the emailed invitation.

### 4. Say yes to the plugins

You may see a prompt asking to install a few **plugins**. Plugins are like apps on
your phone: Claude does plenty on its own, and each plugin adds one extra skill.
These are the design and publishing ones your site uses. It is safe, it happens
once, say yes.

### 5. Then tell it to go

> **"Set up my site."**

That is the entire instruction. Claude will introduce itself, explain what is about
to happen, and start asking about your business.

If you already said "set up my real estate website" back in step 3, it is probably
under way already — you do not need to say it twice.

Honestly, **"hi" works too.** Claude checks whether this site has been set up yet
the moment you open it, and starts the interview on its own if it hasn't. You do
not have to know the magic words — there aren't any.

**Worth having handy:**

- Your license number, brokerage, office address, phone, email
- The towns *and* the neighborhoods inside them that you actually work
- What you specialize in beyond plain buying and selling — first-time buyers, VA,
  downsizing, divorce sales, probate, investors, trading up, whatever you truly do
- A link to any website you already have, plus any photos or old blog posts
  sitting on your computer. Claude pulls from those so you are not retyping things
- Your brand colors, if you have them

**It will never invent anything about you.** If you do not know something it stays
blank rather than guessed, and the site refuses to go live until it is real.

### 6. Expect the first version to be about 70% right

That is deliberate. Claude would rather put something real in front of you and let
you react than guess for hours and get it wrong.

After that it is your whole team: designer, developer, copywriter, editor. You say
what feels off, it fixes it. That back-and-forth is where the site gets good.

---

## The one command worth knowing

```bash
npm run gate
```

It starts your site, checks everything, shuts down cleanly, and tells you in plain
English what is left. You do not need to run it — Claude does — but it is there
whenever you want to see where things stand.

It checks three things: **does the site work**, **is the structured data valid**
(that is what Google and AI assistants read), and **is it ready to go live**.

A brand-new site fails the third one. That is correct. It means the safety net is
working, not that something is broken.

---

## What to ask for, any time

Plain language is enough:

| Say something like | What happens |
|---|---|
| "Add a listing at 123 Oak Street" | Added, with photos and a map |
| "I just sold 123 Oak Street" | Marked sold, site updated |
| "Write a blog post about downsizing" | Written in your voice, linked properly |
| "Here is my headshot" | Sized and placed everywhere it belongs |
| "Build me a seller guide funnel" | Landing page, form, and delivery, wired to your CRM |
| "Change the look" | Updated across the whole site at once |
| "Connect my domain" | Moved onto your own web address, safely |
| "Get me recommended by ChatGPT" | Articles written for AI search |

---

## The safety net

Nothing goes live while it still contains fake or unfinished content. The site
literally refuses to launch.

It also checks that your pages carry no Fair Housing problems, that your license
number and Equal Housing statement appear where they are required, that no two
pages are near-copies of each other, and that your forms actually work.

That protection is always on. It is not something you have to remember.

---

## For the technically curious

Everything above is what most owners need. If you want the detail:

- **Stack:** Next.js (App Router), TypeScript, Tailwind, deployed on Vercel.
  GoHighLevel is used for CRM only, through its API — the site is never hosted there.
- **Your data vs. the machine:** your details live in `site.config.ts` and
  `content/`. Everything else is the engine, and it can be updated without touching
  your content.
- **Schema:** all JSON-LD is generated by `lib/schema.ts` from your config and
  content. Never hand-written.
- **The gates:** `npm run smoke` (does it function), `npm run validate:schema`
  (structured data), `npm run launch:check` (filler, interlinking, near-duplicates,
  brand voice, Fair Housing, licensee disclosure). `npm run gate` runs all three
  and manages the server for you.
- **CI:** `.github/workflows/gate.yml` runs build, smoke, and schema on every push,
  and enforces the full launch check once `launchReady: true`.
- **Skills:** the workflows Claude follows live in `.claude/skills/`. Start with
  `realtor-site-setup`.
- **Chat widget cost and environment variables:** [docs/CHAT-COSTS.md](docs/CHAT-COSTS.md).
- **Legal guardrails:** [.claude/rules/legal-compliance.md](.claude/rules/legal-compliance.md).
- **Node:** 20+ (`.nvmrc` included).
