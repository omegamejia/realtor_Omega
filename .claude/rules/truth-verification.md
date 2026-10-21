# Truth verification — where every value on this site is allowed to come from

This is the rule that governs data, the way `legal-compliance.md` governs claims.
Read it before writing anything into `site.config.ts` or `content/`.

**The whole rule in one line: empty is safe, wrong is harmful, and unconfirmed is
wrong that hasn't been caught yet.**

A blank field costs a little SEO. A wrong field sends buyers to the wrong office,
puts the wrong business in Google's knowledge graph, and is the kind of mistake a
licensed professional gets to explain to their broker. These are not comparable,
so they are never traded off against each other.

---

## 1. Every value has a provenance. Only two kinds may be asserted.

| Provenance | What it means | May reach the site? |
|---|---|---|
| **Confirmed** | The agent said it, or saw it and said yes | **Yes** |
| **Computed** | Derived from confirmed data (a slug, a geocode, a title) | **Yes** |
| **Harvested** | Pulled from their site, a profile, a document — *not yet shown to them* | **No — confirm first** |
| **Default** | A value the seed shipped | **No — treat as empty** |

Harvested data is a **candidate, never a truth.** The step that turns a candidate
into a fact is the agent seeing it and saying yes. There is no other step.

**Why this rule exists in this exact form:** a real setup run put 45 of 127 facts
onto a live site without the agent ever seeing them — including the office
address. Nothing failed. Every gate passed. The data was simply wrong and
confident, which is the worst combination available.

## 2. Seed defaults are not data

A default that renders is a claim nobody made. `priceRange: "$$"` shipped into
`LocalBusiness` schema on every page of a site whose owner was never asked about
pricing — and because it never appears on screen, no human would ever catch it.

- **Never treat a seed default as an answer.** If the agent didn't set it, it is
  empty.
- **Prefer an empty field to a plausible one.** `clean()` in `lib/schema.ts` drops
  empty values from schema entirely, so blank costs nothing structurally.
- If a default asserts something about the agent's business, it does not belong in
  the seed at all — fix the seed, not the instance.

## 3. NAP gets a higher bar than everything else

**Name, address, phone** drive the map pin, the knowledge graph, and every local
ranking signal. One source is not a source.

- **Two independent sources agreeing**, or **explicit confirmation from the
  agent.** A single footer on their old site is neither.
- **A Google Business Profile is authoritative when one exists.** It settles the
  address, the coordinates, and the hours together — and it is the record Google
  is already matching against, so disagreeing with it is the expensive error.
- **Surface conflicts, never resolve them silently.** If the brokerage page, the
  GBP, and their old footer disagree, say so and ask. A conflict is information;
  picking one without saying so destroys it.

## 4. Search first, then ask to confirm

Research costs Claude's time. Interrogation costs the agent's, and they have less
of it and less patience for it. So:

- Go find it — Google Business Profile, Facebook, Instagram, LinkedIn, YouTube,
  Zillow, Realtor.com, Yelp, the brokerage bio.
- Then ask **one** question about what you found: *"Which of these are yours, and
  are they current?"*
- Never assume a profile is theirs because the name matches. Common names exist,
  agents change brokerages, and old profiles outlive the jobs that made them.

## 5. People are data too, and they change

A team roster is a snapshot of a moment. Someone who left three months ago is
still on the brokerage page.

- **Ask whether each person still works there** before writing them a page.
- Never write a bio for someone from an inferred job title.
- Never use a headshot of a person that isn't a photo of that person.

## 6. Anything left empty gets written down

An unanswered question is not a closed one. Every field left blank goes on the
open-items list (`content/OPEN-ITEMS.md`) with what it unlocks, so a later session
can raise it as an upgrade rather than an oversight.

**Blank plus tracked is a good outcome. Blank plus forgotten is how a site stays
half-finished forever, and filled-in-with-a-guess is worse than both.**
