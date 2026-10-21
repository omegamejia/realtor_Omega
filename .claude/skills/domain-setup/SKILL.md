---
name: domain-setup
description: >-
  Put an agent's site on their custom domain — help them BUY one if they don't
  have it, connect a new domain, or carefully SWITCH an existing live domain onto
  this site without breaking their email or losing SEO. Use when someone says
  "buy a domain", "I need a domain", "I don't have a domain", "connect my domain",
  "point my domain", "go live on my domain", "migrate my site", or "switch from
  my old site".
# deep judgment, voice, and creative quality
model: opus
---

# Domain Setup

Pick the situation first.

- **No domain yet** — help them buy one, then it's a new-domain setup. (Branch 0 → A.)
- **New domain** — they have a domain with no live site on it. Low risk. (Branch A.)
- **Existing-domain switch** — a domain that currently runs a live site and/or
  email. This is a MIGRATION with real risk. Do the full runbook. (Branch B.)

**Prerequisites for either:** the site content is written, `npm run validate:schema`
and `npm run launch:check` pass, and `launchReady: true` is set. Don't put an
unfinished site on a real domain.

**You never touch the registrar yourself.** DNS changes happen in the agent's
registrar/DNS host. You prepare the exact records and redirect map; the agent (or
whoever holds that login) applies them, or grants access.

---

## Branch 0 — Buy a domain (they don't have one yet)

The student buys it themselves — **you never enter payment details or purchase on
their behalf.** You help them choose well and pick the easiest place to buy.

### Choosing the name (guide them)
- **Brand/name first:** `theirname.com`, `theirnamehomes.com`, or the team name.
  A personal/brand name travels with them if they change brokerages.
- **`.com` if at all possible.** It's what people type and trust.
- **Short, memorable, easy to say out loud and spell.** No hyphens, no numbers.
- A local keyword can help SEO (`sacramentohomesbyjane.com`) but keep it brand-led,
  not keyword-stuffed.
- **Check brokerage rules.** Some brokerages restrict agent domains/branding — confirm
  before buying. Also do a quick trademark sanity check on the name.

### Where to buy
- **Easiest (recommended for non-technical agents): buy it through Vercel.** Buying the
  domain inside their Vercel project auto-configures DNS and SSL — no A/CNAME records,
  nothing to wire. After purchase it's essentially connected; just set `site.url` and
  redeploy. This is the least-friction path.
- **Or a registrar** (Cloudflare, Namecheap, etc.) if they prefer to hold it there.
  Then follow **Branch A** to point it at Vercel with A/CNAME records.

### After buying
- Bought in Vercel → it's connected; set `site.url` to the new domain, redeploy,
  verify HTTPS. Done.
- Bought at a registrar → go to **Branch A**.

Typical cost is ~$10-25/year (some premium names cost more) — theirs to pay.

---

## Branch A — Brand-new domain (low risk)

1. Add the domain (apex + `www`) in the agent's own Vercel project
   (`vercel domains add theirdomain.com`, or the Vercel dashboard).
2. Vercel shows the exact records. Set at the registrar:
   - apex `theirdomain.com` → `A` record to Vercel's IP, **or** an `ALIAS`/`ANAME` if supported.
   - `www` → `CNAME` to `cname.vercel-dns.com`.
   - **Use A/CNAME records — do NOT delegate nameservers to Vercel.**
3. Pick a canonical host (apex or `www`) and 301 the other to it (Vercel does this
   when you set the redirect on the domain).
4. Wait for verification; Vercel auto-provisions SSL.
5. Set `site.url` in `site.config.ts` to the final `https://` domain and redeploy so
   schema `@id`s and canonical URLs match. (This also fixes `/sitemap.xml` and
   `/robots.txt`, which build their URLs from `site.url`.)
6. Verify: HTTPS loads, no cert warning, both apex and `www` resolve.
7. **Get it indexed.** Add the domain in Google Search Console and submit
   `https://theirdomain.com/sitemap.xml` (the site generates it automatically).
   A brand-new site won't rank until Google knows it exists — don't skip this.

---

## Branch B — Switching an existing live domain (MIGRATION — full runbook)

### The 4 rules that keep it from blowing up
1. **Protect email.** If mail flows to `@theirdomain.com`, the domain's **MX +
   SPF/DKIM/DMARC** records are live. Change **only** the apex `A` and `www` `CNAME`.
   **Never switch to Vercel nameservers** — that drops MX and email goes dark.
2. **301 the old URLs.** Preserve ranking equity; don't 404 existing links.
3. **Keep the old site live + a rollback plan.** Don't tear down old hosting first.
4. **Preserve subdomains.** IDX/search/booking on a subdomain stays pointed where it is.

### Before (prep — nothing goes live yet)
1. **Inventory + export ALL current DNS records** (A, CNAME, **MX, TXT/SPF/DKIM/DMARC**,
   NS, every subdomain). Save this file — it is the rollback and the list of what
   must be preserved.
2. **Note whether the domain currently runs the site inside GoHighLevel** (common for
   agents). If so, DNS points at GHL now; you're moving the *site* off GHL while
   keeping GHL for CRM. Check GHL isn't also handling forms/email on that domain.
3. **Crawl the old site's URLs** and build the 301 redirect map. Add each entry to
   `content/redirects.mjs` as `{ source, destination, permanent: true }`. Map to the
   closest relevant new page — never dump everything to the homepage.
4. **Lower the DNS TTL** to ~300s at the registrar (do this a day ahead) so both the
   cutover and any rollback propagate in minutes.
5. Commit the redirects and redeploy so they're live on the site before cutover.

### Cutover
6. Add apex + `www` in the agent's Vercel project; grab the exact A/CNAME values.
7. At the registrar: point apex `A` and `www` `CNAME` at Vercel. **Leave MX and all
   mail/TXT records exactly as they were. Leave preserved subdomains alone.**
8. Pick the canonical host and 301 the other to it.
9. Set `site.url` to the real domain; redeploy.

### After (verify — do not skip)
10. **Send and receive a test email** to `@theirdomain.com`. Email first, always.
11. Confirm **HTTPS/SSL** is live (Vercel auto-issues once the domain verifies).
12. **Spot-check redirects:** hit several old URLs → confirm 301 → correct new page.
13. Add the new **sitemap in Google Search Console**, request re-index. **Keep the
    redirects for many months** so equity transfers.
14. Update the website link on the **Google Business Profile**, analytics, and major
    directory citations over time.

### Rollback
If email breaks or the site misbehaves: restore the exported DNS records at the
registrar. Because TTL is low, it reverts fast. This is why you kept the export and
kept the old host alive.

---

## What you prepare vs. what the agent does
- **You prepare:** the redirect map in `content/redirects.mjs`, the exact records to
  set, `site.url`, the DNS-inventory/rollback file, and the verification checklist.
- **The agent (or registrar admin) does:** the actual record edits at the registrar,
  and the email + redirect verification with you.

## Never
- Never delegate nameservers on a domain that carries live email.
- Never change MX/SPF/DKIM/DMARC during a site migration.
- Never cut over before content is written and the gates + `launchReady` pass.
- Never point a real domain at the site without saving the old DNS for rollback.
