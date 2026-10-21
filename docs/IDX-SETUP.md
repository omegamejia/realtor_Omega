# Setting up IDX on this site

**IDX is the searchable map of every home for sale in your area.** Your own
listings are already on your site and they do not need this. IDX is what lets
somebody search the *whole market* from your website instead of going to Zillow.

This is the full procedure, in order, with the parts that depend on other people
marked as such. **The part that happens in this repo takes about two minutes.
The part that happens with your MLS and your broker takes days to weeks**, and
that is the part worth starting first.

> **Read this before you start:** nothing here can be hurried, and nothing here
> can be faked. An IDX feed is MLS data licensed to a named broker under a signed
> agreement. There is no version of this that works without the MLS saying yes.

---

## 0. The thing to understand before anything else

**An IDX embed does not help you rank.** It will not.

The seed renders your provider's search as an `iframe` on `/listings`. Google can
crawl inside a frame, but it attributes that content to the URL the frame points
at — your provider's domain, not yours. So thousands of listings appearing on
your page add **nothing** to your own search visibility.

What IDX is actually worth is **retention**: a visitor who wants to browse the
market does it on your site, inside your branding, next to your phone number,
instead of leaving for a portal and being sold to three other agents. That is a
real and sufficient reason to buy it. It is just not an SEO reason.

**The pages that rank for you are the ones you wrote**: your area pages, your
specialty pages, and your own listings, each at its own URL. That is where the
work goes. IDX sits underneath them and catches the browsers.

Say this to a student plainly, because the assumption runs the other way round
and an agent who buys IDX expecting rankings has bought the wrong thing.

---

## 1. Check they are even eligible — ask four questions first

Nobody can have IDX without all four of these. Ask before anything else, because
a "no" on any of them changes the whole conversation.

| Ask | Why it decides everything |
|---|---|
| **"Are you a member of your local MLS?"** | IDX is an MLS policy (NAR Policy Statement 7.58). Access flows through MLS participation. No membership, no feed, no exceptions |
| **"Who is your broker, and will they sign?"** | The *broker* holds the MLS participation and signs the data licence. An agent displays listings under their broker's participation. The broker has to agree |
| **"Do you already pay an IDX provider?"** | If yes this is a ten-minute job. If no, there is a monthly bill coming and they should decide knowingly |
| **"Which MLS?"** | Rules, approved vendor lists, turnaround and display requirements are all per-MLS. There is no national answer |

**If they are not an MLS member**, stop. Their own listings still work, `/listings`
still works, and the site is complete without this. Put it on
`content/OPEN-ITEMS.md` and move on.

---

## 2. The MLS and broker track — start this on day one

This runs in parallel with everything else and it is the long pole.

1. **Pick a provider the MLS has approved.** Each MLS publishes its own list of
   approved IDX vendors. A provider not on that list cannot be approved, no
   matter how good it is. Ask the MLS for the list rather than guessing from a
   provider's marketing.
2. **The broker signs the MLS data licence agreement.** This is the document that
   actually grants the feed. It is signed by the participant — the broker — not
   by the agent.
3. **Submit the IDX request to the MLS**, naming the vendor and the domain the
   data will display on. Some MLSs do this through a member portal, some by email
   to a data-services address.
4. **Wait for approval.** Commonly a few business days, and it varies a great
   deal by board. It is not instant and it cannot be chased into being instant.
5. **The provider provisions the feed** once approval lands and gives you
   credentials or an embed.

> **Two things to tell the student while they wait.** The domain gets named on the
> request, so if they are still on a `*.vercel.app` preview address, this is the
> point where buying the real domain stops being optional — see
> `domain-setup`. And the feed arrives over a **RESO Web API** connection in most
> markets now, replacing the older **RETS**; some boards still run RETS or both.
> They do not need to care which, their provider does, but if a provider only
> speaks RETS that is a question worth asking about how current they are.

---

## 3. Choose the integration pattern — and know which one this seed does

There are three ways IDX reaches a website. **This seed does the first one.**

| | What it is | SEO value to your domain | Work | MLS compliance |
|---|---|---|---|---|
| **1. Embed / iframe** *(this seed)* | The provider's search rendered in a frame on your page | **None** | Minutes | Handled by the provider inside the frame |
| **2. Provider-hosted subdomain** | `search.youragency.com` run entirely by the provider | None to your main domain | Hours, plus DNS | Handled by the provider |
| **3. Direct feed, your own pages** | You pull RESO Web API data and render a page per listing | **Real** — the pages are yours | Weeks, and ongoing | **Yours.** Every display rule becomes your problem |

**Pattern 3 is the only one that earns rankings, and it is a different project.**
It means per-listing pages on your domain, a sync job, handling listings that go
off-market, and carrying every MLS display rule yourself. Do not let a student
believe the two-minute version does what the three-week version does.

**For almost every individual agent, pattern 1 is correct**, because the
rankings come from the written pages and the IDX is there to keep browsers on the
site. Choose it deliberately and say why.

---

## 4. Wire it up in the repo — the two-minute part

Once the provider has given you an embed URL:

1. Open `site.config.ts` and find the `idx` block:

   ```ts
   idx: {
     embedUrl: "",
   },
   ```

2. Paste the provider's embed URL between the quotes. It must be `https://`.

   ```ts
   idx: {
     embedUrl: "https://yoursubdomain.idxbroker.example/search",
   },
   ```

3. Run the gate:

   ```bash
   npm run gate
   ```

4. **Open `/listings` in a browser and search for a real address.**

That is the whole of it. There is no component to add, no route to create, and
nothing to style.

### What happens on the page, and the one rule about order

`/listings` renders **the agent's own listings first, and the MLS search below
them.** That order is deliberate and must not be flipped: their listings are why
somebody is on that page, and the IDX feed is the catch-all for everything else.

Leave `embedUrl` blank and the IDX block does not render at all — no empty
heading, no grey box. **Blank is a complete, correct, passing state.**

---

## 5. What the gate checks, and what it cannot

`npm run gate` has an IDX layer. It is deliberately honest about its limits.

**Checked:**

- Blank is fine and says so, rather than nagging
- A value still containing a placeholder or a bracket **fails**
- A value that is not `https://` **fails** — a browser silently refuses an
  `http://` frame inside an `https://` page and renders nothing, with no error
  anywhere a non-technical owner would find it
- A value that is not a valid URL **fails**
- A value that is set but reaches no iframe on `/listings` **fails**

**Not checked, and it prints a warning saying so:**

- **Whether the provider's search actually loads.** The frame is cross-origin, so
  nothing on this side can read inside it. A domain the provider has not
  whitelisted renders as an *empty rectangle*, not an error.
- Whether the feed is current, complete, or the right MLS.

**So the last step is always a human opening the page.** Do it at a phone width
too. This is the single most common way an IDX setup is "finished" and broken.

---

## 6. Compliance — why the iframe is fine, and when it stops being fine

Every MLS that offers IDX sets display rules. The common ones:

- The **listing firm** named on every listing view
- The **listing agent** named
- A notice that the data is **"deemed reliable but not guaranteed"**
- Rules on refresh frequency, and a prohibition on scraping or re-publishing

**With the iframe pattern, the provider renders all of that inside the frame**,
which is why there is nothing to add in this repo and why
`.claude/rules/legal-compliance.md` §7 says the provider's embed handles
compliance. That is accurate *for this pattern*.

**It stops being accurate the moment anybody moves to pattern 3.** Pulling the
feed and rendering your own pages makes every display rule yours, on every view —
grid cards and map thumbnails as well as detail pages. If a student ever asks for
"IDX listings on my own URLs", that is the conversation to have first.

**And the rule that does not change either way:** never hand-copy MLS data onto a
page. Not a photo, not a description, not a price. Listing photos are usually the
photographer's copyright licensed to the listing brokerage, and a hand-built page
carries none of the required attribution. `truth-verification.md` §3b is the
governing version.

---

## 7. When it does not work

| What they see | Almost always |
|---|---|
| **An empty rectangle where the search should be** | The provider has not whitelisted this domain. Most common on a first deploy, and again the day the real domain is connected — **the whitelist is per-domain, so connecting a domain means telling the provider about it** |
| **Nothing renders at all, no box** | `idx.embedUrl` is blank, or the site has not rebuilt. Check the config, then redeploy |
| **Works locally, blank once deployed** | The preview URL was whitelisted and the production one was not |
| **A browser console error about mixed content** | The embed URL is `http://`. The gate catches this before deploy |
| **Search works, clicking a listing does nothing** | The provider needs popups or top-level navigation. The seed's frame allows top-level navigation on a user click and does not allow popups. Ask the provider which they require |
| **Two scrollbars, or the page will not scroll on a phone** | Expected to a degree: the provider's page scrolls inside the frame. The seed sizes the frame to the viewport to minimise it |

---

## 8. The replicable checklist

For a student to copy. Everything above `—` is other people; everything below is
fifteen minutes.

```
MLS AND BROKER  (days to weeks, start first)
[ ] Confirm MLS membership
[ ] Confirm which MLS
[ ] Broker agrees to sign the data licence
[ ] Get the MLS's approved-vendor list FROM THE MLS
[ ] Choose a provider from that list
[ ] Buy the provider plan
[ ] Broker signs the MLS data licence agreement
[ ] Submit the IDX request, naming vendor + the domain it will display on
[ ] MLS approval received
[ ] Provider provisions the feed and issues an embed URL
[ ] Domain added to the provider's whitelist
—
IN THE REPO  (minutes)
[ ] Paste the embed URL into site.config.ts -> idx.embedUrl  (https:// only)
[ ] npm run gate
[ ] Open /listings in a browser and search a real address
[ ] Open /listings at a phone width and do it again
[ ] Confirm own listings appear ABOVE the MLS search
[ ] Deploy
[ ] Re-test on the live domain
[ ] When the real domain is connected: re-whitelist with the provider, re-test
[ ] Record "IDX: done" on content/OPEN-ITEMS.md
```

---

## 9. What to say to an agent, in their words

On what it is:

> "IDX is the live list of every home for sale in your area. Your own listings
> are already on your site. Adding IDX means somebody can search *every* home
> from your website instead of going to Zillow, which keeps them with you."

On what it is not:

> "It will not help you show up in Google. The frame it lives in belongs to your
> provider, so Google credits them for that content, not you. What gets you
> found is the pages we wrote. IDX is there so that somebody who lands on those
> pages and wants to browse never has to leave."

On the timeline, which is the thing they will not expect:

> "The part I do takes two minutes. The part your MLS and your broker do takes
> a few days to a few weeks, and it has to come first. If you want this, the
> thing to do today is ask your broker and ask your MLS for their approved
> vendor list."

On deciding not to:

> "Completely fine, and the site is finished without it. Your own listings are
> the reason anyone is on that page anyway. We can add it any time — it is one
> line of settings once your provider gives you the link."

---

## Where the pieces live

| Thing | File |
|---|---|
| The setting | `site.config.ts` → `idx.embedUrl` |
| The page | `app/listings/page.tsx` |
| The gate layer | `scripts/launch-check.mjs` → `checkIdx()` |
| The setup conversation | `.claude/skills/realtor-site-setup/SKILL.md` Phase 5f |
| Revisiting a deferred IDX | `.claude/skills/listings-routine/SKILL.md` |
| The agent's own listings | `.claude/skills/listings-manager/SKILL.md` — separate from this, and both coexist on the page |
| MLS content rules | `.claude/rules/legal-compliance.md` §7 |

---

## Sources for the third-party facts on this page

Checked 2 October 2026. Provider names, prices and per-MLS rules change; the
structure does not.

- NAR, [Internet Data Exchange (IDX) Policy, Policy Statement 7.58](https://www.nar.realtor/handbook-on-multiple-listing-policy/advertising-print-and-electronic-section-1-internet-data-exchange-idx-policy-policy-statement-7-58)
- [IDX Broker — MLS approval process and terms](https://blog.idxbroker.com/mls-approval-popular-terms-clearly-explained/)
- [MLSListings — IDX FAQ](https://support.mlslistings.com/s/article/IDX-FAQ)
- [RESO — moving to replication via the RESO Web API](https://www.reso.org/moving-replication-reso-web-api/)
- [GSMLS — IDX display guidelines](https://forms.gsmls.com/IDX/idxdisplayguidelines.pdf) (an example of per-MLS display rules, not a national standard)
- Google Search Central, [`indexifembedded` robots tag](https://developers.google.com/search/blog/2022/01/robots-meta-tag-indexifembedded) — on how iframed content is attributed

**Per-MLS rules are not on this page on purpose.** There are hundreds of MLSs and
their rules differ. Get them from the MLS the agent actually belongs to, and if a
student asks a question this page does not answer, the answer is their MLS's
data-services desk rather than a guess.
