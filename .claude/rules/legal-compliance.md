# Legal compliance rules for real estate sites

**This is not legal advice, and nothing here substitutes for the agent's own
counsel or their broker's compliance officer.** It is a set of guardrails that
keep AI-written real-estate marketing inside well-established US requirements, so
the work does not create liability for a licensed professional.

**These rules guide the writing; they do not block it.** Unambiguous violations
fail the gate. Anything context-dependent warns and asks a human to look. The
goal is content that is both good and lawful, not content that is timid.

---

## 1. Fair Housing Act — the one that matters most

Every page on these sites is **advertising by a licensed real estate
professional**, which puts it squarely under the FHA. Protected classes: race,
color, national origin, religion, sex (including sexual orientation and gender
identity), familial status, and disability. Many states and cities add more —
California adds source of income, marital status, age, and others.

**The rule that resolves nearly every case: describe the PROPERTY, never the PEOPLE.**

An AI writing neighborhood copy produces steering language *by default*. "Great
for families" is the natural phrasing, which is exactly why this needs a
mechanical check rather than good intentions. `npm run launch:check` enforces it.

| Never | Instead |
|---|---|
| "Great/perfect for families" | "Four bedrooms, fenced yard, park at the end of the street" |
| "Safe neighborhood" | A verifiable fact, or nothing |
| "Walking distance to church" | "…to shops, restaurants, and places of worship" |
| "Good schools" | Name the schools or district; let the reader judge |
| "Exclusive community" | Describe what is actually there |
| "Ideal for young professionals" | Describe the home |

Never describe who lives somewhere, who would "fit in," or the character of the
residents. Amenities, distances, dimensions, and verifiable facts are always safe.

**Accessibility is a Fair Housing matter too.** Disability is a protected class,
and inaccessible real-estate websites are an active area of litigation. The
design system already carries this (44px touch targets, AA contrast, visible
focus, semantic headings) — do not regress it.

## 2. Licensee disclosure

Most states require advertising to identify the licensee and the brokerage.
California (DRE) requires the license number on "first point of contact"
materials, which includes a website.

The seed renders **agent name, license number, and brokerage in the footer on
every page**, so this is satisfied by default. The gate now verifies it is still
there and still real, because deleting a footer line or leaving `license` blank
would otherwise ship silently.

**Never invent a license number.** It is a verifiable public record and a wrong
one is worse than a blank. If the agent has not supplied it, it stays a
placeholder and the gate keeps blocking launch.

**Team-name rules:** several states require the brokerage to appear with equal or
greater prominence than a team or DBA name. The footer names the brokerage on
every page. If an agent wants team branding larger than the brokerage, tell them
to confirm it with their broker first.

## 3. Equal Housing Opportunity

The footer carries the Equal Housing Opportunity statement site-wide, and the
gate verifies it. Do not remove it.

## 4. Testimonials and claims (FTC)

The never-fabricate rule already covers most of this, but stated explicitly:

- **Testimonials must be real**, from real clients, used with permission. Never
  write an illustrative one, even as a placeholder that "will be replaced."
- **Results must be typical**, or the atypicality disclosed. "Sold in 3 days" as
  a general promise is a problem; as a described specific past sale it is fine.
- **Endorsements that were compensated must say so.**
- **Statistics need a real source.** Any market figure without one is
  `[PLACEHOLDER: local stat to verify]` — the gate blocks it either way.
- **Time-based claims rot.** "17 years" and "since 2008" need re-confirming
  annually; prefer "more than two decades" which stays true.

## 5. Privacy law — get the basis right

**Do not tell an agent "CCPA applies to you." It usually does not.** CCPA/CPRA
applies to a for-profit business that meets at least one threshold: gross revenue
over **$26,625,000** (the 2026 inflation-adjusted figure), or buying/selling/
sharing the personal information of **100,000+** California consumers a year, or
deriving **50%+** of revenue from selling personal information. An agent doing $50M
in *sales volume* earns commission nowhere near the revenue threshold. Most solo
agents and small teams are outside CCPA entirely.

**What does apply to every one of them is CalOPPA** (Cal. Bus. & Prof. Code
§ 22575). Any commercial website that collects personally identifiable information
from California residents must **conspicuously post a privacy policy**. There is no
revenue threshold. A contact form collecting a name and email triggers it.

So the privacy policy is required — just cite the right reason. It is also a
practical requirement: Meta, Google, and most ad platforms will not run traffic to
a page without one, and these sites exist to be advertised to.

If an agent's team is genuinely large, or they operate in a state with a lower
threshold, that is a question for their counsel rather than a guess from us.

## 5b. Where the leads actually go

An agent's website is not the only place their clients' data lives. A lead entered
on the site flows to **GoHighLevel** (CRM), passes through **Vercel** (hosting),
and chat conversations reach **Anthropic**. Each is a service provider processing
personal information on the agent's behalf.

Tell them this plainly during setup. They are responsible for the data even though
someone else stores it, and their privacy policy should say who receives it. All
three vendors publish standard terms covering this; the agent does not need to
negotiate anything, but they should know the chain exists rather than discover it
after an incident.

**Retention:** leads sit in a CRM forever by default. That is a growing liability
and a question worth raising once, not a setting to change for them.

## 5c. If there is ever a breach

Every US state has a data-breach notification law, and they apply regardless of
business size. If an agent's CRM or site is compromised and lead data is exposed,
notification obligations are triggered on **statutory deadlines**.

This is genuinely outside what this project can handle. If an agent reports a
suspected breach, the correct response is: tell them to contact their broker and
counsel immediately, and do not advise them on timelines or wording.

## 5d. Describing the transaction process (buying especially)

A page that explains "how buying a home works" is the agent telling a consumer
what to expect from a legal transaction. Get it wrong and it is wrong under their
license, not ours.

**Selling varies by state. Buying varies more.** All of the following change by
state and sometimes by county:

| Thing | How it varies |
|---|---|
| **Closing** | Attorney-required states versus escrow/title states. "We meet at the settlement table" is simply false in much of the country. |
| **Inspection window** | An option period is not an inspection contingency. Different name, different mechanics, different rights. |
| **Earnest money** | Amount, who holds it, and when it becomes non-refundable. |
| **Dual agency** | Legal in some states, illegal in others. Never describe it as normal. |
| **Disclosures** | What a seller must disclose, and on what form. |
| **Closing costs** | Who traditionally pays what is local custom, not law, and it is county-level in places. |

**Buyer representation is the one to be most careful with.** Written buyer
agreements before showings are now standard practice, and how the agent is
compensated is both legally sensitive and actively litigated. Describe only what
is true for **this agent in this state**, and never imply a commission is set by
anything other than agreement. Do not state or suggest that fees are standard,
customary, or fixed, because that is the exact language antitrust cases turn on.

**The rule: every step of a process page is confirmed with the agent before it is
published.** Not researched and assumed. They are the licensee, they know their
market, and they carry the liability. If they are not sure, the answer is a
`[PLACEHOLDER: confirm with broker]` marker and an open item, never a plausible
national default.

**Add the standard scope line** to any process page: this describes their general
process and is not legal, tax, or lending advice.

## 6. Lead capture and messaging consent

Collecting a phone number and then texting it engages **A2P 10DLC and TCPA**.
Carrier filtering blocks non-consented SMS and can flag the sending sub-account.

- Any form collecting a **phone number** must show explicit consent language
  before submission, and the consent must be recorded.
- Consent language must say who is contacting them, that message and data rates
  apply, and how to stop.
- Never pre-tick a consent box.
- A privacy policy must exist and be linked wherever data is collected — required
  by CalOPPA for any site collecting PII from California residents (see §5), and
  by every major ad platform before they will run traffic to the page.

## 7. Property photos and MLS content

- Listing photos are usually the **photographer's** copyright, licensed to the
  listing brokerage. Do not reuse another brokerage's listing photos.
- IDX/MLS data carries display rules set by the MLS. The IDX provider's embed
  handles compliance; hand-copying MLS data onto pages does not.
- See `.claude/rules/image-sourcing.md` for the full image ladder and the hard
  rule against presenting stock or AI imagery as a real place.

## 8. What the gate enforces mechanically

| Check | Level |
|---|---|
| Fair Housing steering phrases | **fail** (unambiguous) / warn (context) |
| Licensee name + license number present site-wide | **fail** if missing |
| Brokerage named site-wide | **fail** if missing |
| Equal Housing Opportunity statement | **fail** if missing |
| Invented stats / placeholders | **fail** (filler layer) |
| An advertising or analytics tag the privacy policy never names | **fail** (see §9) |

Everything else on this page is judgment, and judgment is the human's job. When
something is genuinely ambiguous, say so and let the agent decide with their
broker — never quietly guess.

## 9. Advertising pixels and analytics

An agent can run their own Meta pixel and Google tag on the site
(`site.config.ts` → `tracking`). Both ship blank, and with both blank not one
third-party script loads.

**They are the agent's tags on the agent's accounts.** Nothing in this package
reports to KMC or to anybody the agent did not choose, and no ID is ever shipped
inside the engine. Do not add a tag nobody asked for.

**Disclosure is the requirement, and it is enforced.** CalOPPA (§5) makes the
policy describe what is collected and who receives it, and Meta's and Google's
own terms require the same of anyone running their tag. `npm run launch:check`
fails a site whose privacy policy never names a configured vendor. Write that
paragraph **with** the agent: what the tag does, who receives the data, and how a
visitor opts out — their browser's settings, and the platform's own ad settings.

**Campaign data is not personal data, and the line is the referrer.** The site
records the campaign tags and the ad platforms' own click IDs with each lead
(`lib/attribution.ts`), which describe the advert rather than the person, and
reduces the referring site to a hostname. Never widen that to the full referring
URL: it can carry somebody's search terms or profile, and it would put them in
the CRM under a heading nobody agreed to.

**Never put personal data in an event.** No name, email, phone or address, in the
payload or in the URL. Meta's advanced matching and Google's enhanced conversions
both exist and are both deliberately unused here: that is the agent's clients'
data, and a small lift in attribution does not buy the right to hand it over. An
event says a lead happened, never who.

**CPRA "sharing".** Targeted advertising counts as sharing personal information
under California law. Most solo agents sit under the CCPA/CPRA thresholds (§5),
so the "Do Not Sell or Share My Personal Information" link is usually not
required — but a team that meets one does need it, and that is a question for
their counsel rather than a guess from us.

**Outside the US.** Advertising into the EU or UK requires consent *before* the
tag loads. This package does not implement a consent banner, so do not tell an
agent that a US privacy policy covers it.

**Never a tag on an unwritten policy**, and never a consent-shaped checkbox that
does nothing.
