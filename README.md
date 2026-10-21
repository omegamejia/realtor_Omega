# Realtor Site Seed

A clone-once-per-agent real estate website. Config-driven (`site.config.ts`),
auto-generated JSON-LD schema, a scaffold system for unwritten pages, and launch
gates that block filler/broken schema/missing interlinks. Setup, content, and
maintenance are driven by the Claude skills in `.claude/skills/`.

- Start setup: open the repo in Claude Code and say **"set up my site"** (runs the
  `realtor-site-setup` skill), or read `.claude/skills/realtor-site-setup/SKILL.md`.
- Local dev: `npm install` then `npm run dev` → http://localhost:3000

## The gates (definition of "done")

Run against a running server (`npm run dev` in one terminal, these in another):

```bash
npm run validate:schema   # JSON-LD structure valid + @id refs resolve on every route
npm run launch:check      # blocks filler/placeholders/missing interlinks; requires launchReady: true
```

A fresh, unconfigured clone is *supposed* to fail `launch:check` — that's the gate
working. CI (`.github/workflows/gate.yml`) enforces build + schema on every PR, and
enforces `launch:check` once `launchReady: true` (i.e. once the site is live).

## Chat widget cost (read before a high-traffic launch)

`/api/chat` calls a **paid Anthropic API per message on a public page**, using the
owner's own `ANTHROPIC_API_KEY`. It ships with defenses (see below), but you own the
spend, so size it before promoting the site.

**Model:** `claude-haiku-4-5` (a fast, low-cost model), `max_tokens: 500` per reply.
The site knowledge block is sent with prompt caching, so repeat turns are cheap.

**Rough per-message cost** (Haiku 4.5 pricing; verify current rates):

| | Input | Output |
|---|---|---|
| Price | ~$1 / M tokens | ~$5 / M tokens |
| Typical message | ~1.5k tokens (cached knowledge + short history) | ~200 tokens |

That's on the order of a fraction of a cent per message. Monthly estimates:

| Messages/month | Ballpark cost |
|---|---|
| 100 | pennies |
| 1,000 | a few cents to ~$1 |
| 10,000 | low single-digit dollars |

Cost is low per message but **unbounded without a ceiling**, so the widget enforces:

- **Per-IP rate limit** (`8/min` by default).
- **Daily spend ceiling** (`CHAT_DAILY_MAX`, default `2000` messages/day) — once hit,
  the widget falls back to "seed mode" (points visitors to phone/contact) instead of
  paying for more.
- Both are **durable across serverless instances when Upstash Redis is configured**
  (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`). Without Upstash they fall
  back to a best-effort in-memory limiter — fine for low traffic, **not a real ceiling
  under scale**, so wire Upstash before a high-traffic launch. See `lib/ratelimit.ts`.

## Environment variables

See `.env.local.example`. Server-only (never shipped to the browser):

- `ANTHROPIC_API_KEY` — the on-site chat (optional; without it, chat runs in seed mode).
- `GHL_API_TOKEN` — contact-form → GoHighLevel lead creation.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — durable rate limiting (recommended before launch).
- `CHAT_DAILY_MAX` — optional override for the chat daily message ceiling.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · JSON-LD schema · Vercel · GoHighLevel (CRM only).
