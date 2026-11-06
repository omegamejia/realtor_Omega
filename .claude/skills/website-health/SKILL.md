---
name: website-health
description: Grades any website the way Krista's website seeds are graded before they are allowed to launch, and opens a visual report card in the browser. Google's own Lighthouse test on a phone (speed, accessibility, best practices, SEO, with a picture of the phone screen), whether Google and AI assistants can find and read it, broken pages and links, leftover template text and claims that need proof, the advertising rules for the trade (Fair Housing and licensing for agents, NMLS and lending claims for lenders, dental, contractor, pest, auto and salon rules by state), and privacy. Read-only. Use when the owner says "check my website", "grade my website", "website health check", "audit my site", "how healthy is my website", "is my website any good", "check [address]", "grade [address]", or "compare my site to [competitor]".
audience: universal
ships-to: [agent-aos, authority-os]
funnel-stage: 1-marketing
model_tier: workhorse
roster-manager: rhea
version: v1.1
---

# Website Health

**One job: tell the owner, in plain words and one picture, how healthy any website is and what to fix first.**

It runs the same checks a site built from Krista's website seeds has to pass before it is allowed to launch, against any address: the owner's site, a competitor's, a site they admire. The result is a report card that opens in their browser, plus three lines in chat.

## What it checks

- **Google's own test, on a phone.** Lighthouse: speed, accessibility, best practices, SEO, with a screenshot of what a phone shows. Our bar is the seeds' launch bar: speed 85, accessibility 100, best practices 95, SEO 100.
- **Can Google and AI assistants find it.** Padlock and a valid certificate, sitemap, robots file, titles, descriptions, one main heading per page, share previews, an `llms.txt`, image descriptions, and whether the words are there before JavaScript runs (most AI assistants do not run it).
- **Structured data.** What tells AI what the business is: on every page, written correctly, declares a business.
- **Broken pages and dead ends.** Pages that fail, links that go nowhere, links home and to contact on every page.
- **Words on the page.** Leftover template text, unfilled `[blanks]`, claims that need proof ("#1", "guaranteed"), near-duplicate pages, robot-sounding phrases.
- **The trade's advertising rules.** Real estate: Fair Housing, steering phrases, commission wording, license, brokerage and Equal Housing on every page. Lenders: fair lending, rate and payment claims, NMLS numbers, Equal Housing Lender. Dentists, contractors, pest control, auto repair and salons: the rules on file for their trade, and their state's rules where those were verified.
- **Privacy.** A privacy policy, and whether tracking tools on the site are named in it.
- **Security score.** Whether plain http sends visitors to the secure address; how many days the security certificate has left (a red flag under 30); how many of five browser protection settings are in place (HSTS, content-security-policy, frame protection, content-type protection, referrer policy); insecure files on a secure page; on WordPress, whether the site announces its version and whether the sign-in and remote-access files answer to anyone (asked once each, never tried; the public check does not ask for them at all).
- **Ownership, from public records.** When the address registration ends (a red flag under 60 days). The registrar, name servers and host are kept for the owner's copy only. An address on a hosting company's own domain (vercel.app, netlify.app and the like) is not looked up: those records belong to the host.
- **Email trust, from DNS.** Whether a DMARC policy (quarantine or reject) and an SPF record ending in -all or ~all exist. DKIM is always **not measured**: its key name is private to whoever sends the email.
- **AI readiness.** Whether the robots file turns away GPTBot, ClaudeBot, PerplexityBot or Google-Extended; whether article and question pages open with the question and the city; whether the sitemap's newest change is under 90 days old.
- **Looked after.** Copyright year older than last year; newest post older than a year; how many scripts from other companies the home page loads and their weight.
- **Security of the software behind the site.** Only what the site states outright is scored: a PHP version its server shows (fails when it is below the PHP2Shell fix of 21 Oct 2026, or 8.1 and older, which get no fixes at all) and a plugin version on its own files (Elementor Pro's attacked CVE-2026-32475, fixed in 4.2.2). A version the site hides is listed as **not measured** and never lowers the grade. The list of flaws is dated and printed on every report; it is not a full security scan, and the report says so.

**What the site is built on.** A box near the top of the report says, in one line, what the site runs on when the files it loads, its headers or its own pages name it (WordPress and its builder, such as Elementor or Divi; Drupal, Joomla, Next.js; a hosted builder such as Wix or Squarespace, which PHP flaws cannot reach; or PHP on its own), for example "Built on WordPress with Elementor, which runs on PHP." When PHP is involved, that line moves into the red **Red Flags** section.

**Red Flags.** A red section above "Fix these first" lists, each with a 🚩 and one plain sentence, what was found that is worth worrying about: the site runs on PHP (PHP sites have had security issues and breaches, most recently the 21 Oct 2026 emergency update; sites not built on PHP, like BOSS-built ones, do not carry that weakness), a builder or plugin with a known critical flaw, out-of-date PHP, no padlock, a broken security certificate, the site hidden from Google, no privacy policy, and, when the trade is known and not just guessed from word counts, Fair Housing or fair lending wording, a missing license or NMLS number, Equal Housing Lender missing, or claims the state does not allow. A flag says what was found, not how to fix it, and is not repeated under "Fix these first". It never says a site is safe, and none of this is part of the grade. Code: `scripts/security.py`.

Anything it could not measure is listed as **not measured**, never as passed. In the grade, the five areas above (security score, ownership, email trust, AI readiness, looked after) count together as ONE area, so one missing DNS record cannot cost a letter; they are shown one by one. (Weight is the owner's to change.) A site on this computer (`--local`) is never looked up in public records or DNS.

## What it never does

Read-only, always. It never fills in a form, signs in, or changes anything on any website. It reads at most 25 pages and 60 links, one at a time, with a pause between, so it is polite to someone else's live site. It does not email anyone.

The trade rules are **flags to look at, not a legal ruling.** Say so if the owner asks whether something is "legal."

## How to run it

1. **Find the folder.** The kit's vault is `Agent-OS/` or `Authority-OS/`, whichever exists. Reports go in `<vault>/07-Marketing/Website-Health/`.
2. **Know the trade, when you can.** `--who real-estate-agent`, `lender`, `coach-consultant` or `local-service` is the owner saying who they are, and it decides the rules over anything the page's markup says (a coaching site that calls itself a RealEstateAgent is graded as a coach). `local-service` never gets real estate or lending rules. The check works out the trade from the site itself (its own markup, then its home page) and says how it decided. When the owner is checking their own site and `.claude/rules/user.md` or the brand system names their role, pass it (a competitor's site is in the same trade, so pass it there too): `--industry real-estate`, `lender`, `dentist`, `orthodontist`, `contractor`, `roofer`, `plumber`, `electrician`, `hvac`, `landscaper`, `pest-control`, `auto-repair`, `salon`, `barber`, `medspa`, or `general`. Pass `--state CA` (two letters) when you know their state; otherwise the site's own address is used.
3. **Run it:**

   ```bash
   bash .claude/skills/website-health/scripts/run.sh <address> --out-dir "<vault>/07-Marketing/Website-Health" --open
   ```

   Two or three addresses compare them side by side, the first labelled as theirs: add `--labels "Your website,Competitor"`. Say so before you start: *"I'm reading your site the way Google and AI assistants do. I'll tell you when the report card is ready."* Never state how long it takes.

   **The public report.** Inside BOSS the report offers fixes (that is the product: BOSS offers to make the change, saves a restore point first, and publishes only with the owner's yes). The report a stranger gets from the public Website Health Check says what is wrong and never how to fix it, because the fix is what is sold (`--public`; rule `ranker-what-not-how`). `--public` writes `report.html` with counts and categories only, no fix line, and no plugin, theme or version, and `report-owner.html` with the exact names, versions and who holds the web address, for the owner's emailed copy, also with no fix line. The owner copy covers the first address only: a site compared with it is always public. The same switch cleans the data files and the screen summary. At the end of a public report: a side-by-side with a rebuilt site and a talk-to-us button. The side-by-side reads a real, dated measurement kept in `reference/seed-site.json` (`--save-reference` writes it from a finished, live, public site; with no file the section is left out, never filled with a promise). The button reads `reference/cta.json`.

4. **The first time only,** it puts a private copy of Node in the home folder so Google's test can run on this computer (about 40 MB, no password, nothing else touched). If that cannot happen, Google's free online version of the same test is used for public sites.

5. **Tell them.** With `--open` the report opens in their browser by itself. In chat, three things and stop:
   - The grade, always the number out of 100 together with its letter (the letter is read off the number: 90+ A, 80+ B, 70+ C, 60+ D, below 60 F), and one sentence on what it means. The number is the average of the category scores minus a quarter point for every point one of Google's four scores is under its launch target; the report says how many points that took off.
   - The top three fixes, in plain words. Take them in order from the script's "Fix these first" lines (the report's "Fix these first" section is the same list): legal and trust problems come first on purpose.
   - Where the report is saved, as a path they can click.
   - When the trade was worked out from the site, say which trade in a few words ("I checked it as a real estate site"). If the owner says that is wrong, run it again with the right `--industry`. The trade decides which rules apply.
   **Comparing sites:** give each grade (number and letter), the top three fixes for *their* site only, and one line on where the other site is weaker or stronger.
   Then offer one next step: fix what can be fixed for them, or check a competitor the same way.

## When it cannot read a site

- **"Turned our checker away"**: the site's security service blocked automatic visitors. That is the site protecting itself, not a fault visitors see. Google's test may still have run. Say that plainly and do not call the site broken.
- **"Did not answer"**: check the address with the owner before saying the site is down.
- **Google's test has no scores**: the report says why, and the result's `lighthouseUnavailable.reason` holds the same words. Relay that reason once, in plain words. No Chrome on this computer: installing Google Chrome and running it again fixes it. The site's security turned our checker away, the site is not launched yet, or the test timed out in our checker: those four scores are left out of the grade and it is not the site's fault. Only when the page itself is broken for real visitors do they count against the grade; then say what broke and that it needs fixing.

## How to talk about it

Say what a visitor, Google or an AI assistant would experience: "Google can't tell what this page is about," "a shared link shows no picture," "AI assistants can't read your words." Never say status code, HTML, DOM, JSON, schema, crawler, server, SSL, DNS or Lighthouse category to the owner unless they ask how it works. (`.claude/rules/plain-words.md`)

## Proof it works

`bash .claude/skills/website-health/scripts/prove-website-health.sh` runs 361 cases against fake sites on this computer, with no internet needed: a clean site gets an A; a messy one has every planted problem caught; Fair Housing, lending, dental (California, Ohio), and contractor (California, Nevada) rules fire where they should and stay quiet where they should not; bot shields, gzip, foreign characters, JavaScript-only pages, a 1,000-page sitemap, error pages and junk addresses are handled honestly; hostile page content cannot get into the report; and a deliberately hostile site (gzip bomb, a page that drips one byte at a time, pattern bombs, broken markup, redirects to other kinds of address) cannot crash it, hang it, or point it at this computer; and every reason Google's test can fail to score a site is told apart and graded by the owner's rule. Add `--lighthouse` to run Google's test too.

## Where it came from

The checks are the launch gate from `realtor-site-seed` (Lighthouse floors, structured data, launch checks, Fair Housing), the trade rules from `local-service-site-seed` and `service-site-seed`, and the outside-site port built for the Summit AI Preview. The engine is identical in both kits.

## What has to arrive with it

```ship-check
id: wh-route
kind: contains
kit: both
file: CLAUDE.md
needle: re:^\|.*"check my website".*`website-health`
why: a skill with no routing row is one BOSS never picks
```

```ship-check
id: wh-ref-1
kind: ref-optional
kit: agent
file: Agent-OS/07-Marketing/Website-Health
why: created by the first report; absent means no site has been checked yet
```

```ship-check
id: wh-ref-2
kind: ref-optional
kit: authority
file: Authority-OS/07-Marketing/Website-Health
why: created by the first report; absent means no site has been checked yet
```
