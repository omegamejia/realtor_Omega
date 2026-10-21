# Ported From

- **Source:** Krista Mashore's AEO/GEO article method, adapted for this repo.
- **Ported:** 2026-07-30
- **Principle:** **content method = hers; project rules = ours.** Where the two
  conflict, this repo's rules win.

## Kept verbatim in spirit (Krista's method)

- Entity establishment + the entity-reinforcement pattern (same identity line,
  repeated throughout the article) — the core mechanic
- Question-based headers over generic SEO headers
- Article spec: 1,500–2,500 words; direct answer up front → step-by-step →
  common mistakes → real scenarios → FAQ
- Local authority signals (named neighborhoods, real local process, no filler)
- Session menu (mine questions / write article / improve foundation)
- Publish-first, then repurpose at 20–40% overlap with a link back
- No third-party names; never invent facts; one article at a time
- The IP boundary protecting her internal automated build/publish system

## Changed for this project (our rules override)

| Source skill | This repo | Why |
|---|---|---|
| User writes in chat, uploads to their own site | Article is a real page in `content/posts.ts` / `content/pages.ts` | Content lives in the codebase and goes through the gate |
| Entity collected by interview each session | Entity derived from `site.config.ts` | Config already holds confirmed, signed-off data; guarantees consistency |
| FAQ written as prose in the article | `faqs` array on the page content | Auto-renders the FAQ **and** emits `FAQPage` schema — better for AI Overviews |
| (no schema guidance) | Never hand-write JSON-LD; `lib/schema.ts` generates it | Repo hard rule |
| `[VERIFY: number]` | `[PLACEHOLDER: local stat to verify]` | Our marker is what `launch:check` detects |
| "3–5 links, placeholders fine" | 5–8 internal links, home + `/contact` required, no placeholders | `launch:check` fails otherwise; hub-and-spoke model |
| No publish gate | `validate:schema` + `launch:check` + `site-design-system` | Nothing ships un-gated |
| Log run to `_Operations-Log.md`; never read `14-Confidential/` | Dropped | Krista-vault-specific; no equivalent here |
| Optional routing through her `copywriter` skill | Follow `realtor-content-writer/content-model.md` | That's this repo's canonical spec for words |

## Known tension, resolved deliberately

Her article length (1,500–2,500 words) exceeds this repo's blog target
(800–1,200 in `content-model.md`). Resolved by treating an AEO authority article
as its **own content type** at her length, with every other rule in
`content-model.md` still applying. Documented in the skill so it doesn't read as
an accident.
