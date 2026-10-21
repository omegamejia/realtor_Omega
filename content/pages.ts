/**
 * Rich, long-form page content (800-1,200+ words), keyed by URL path.
 *
 * SEED STATE: empty. Every area / niche / money page therefore renders its
 * SCAFFOLD (see lib/scaffold.ts) — a full-length, section-by-section brief that
 * shows the agent (and their Claude) exactly what to write and how long.
 *
 * The content skill (.claude/skills/realtor-content-writer) fills entries here,
 * one per page, keyed by the page's URL path. A page with an entry renders the
 * real content; a page without one renders the scaffold. The launch gate blocks
 * any page still on its scaffold.
 *
 * Example of a filled entry:
 *   "/areas/your-city/selling-your-home": {
 *     metaTitle: "Sell Your Home in Your City | Your Business",
 *     metaDescription: "...150-160 chars...",
 *     h1: "Selling Your Home in Your City",
 *     primaryKeyword: "sell your home in your city",
 *     secondaryKeywords: ["...", "..."],
 *     sections: [{ heading: "...", html: "<p>...</p>" }],
 *     ctas: [{ text: "Get My Free Home Value", placement: "primary" }],
 *     faqs: [{ q: "...", a: "..." }],
 *   }
 */

export type PageCTA = { text: string; placement: string };
export type PageSection = { heading: string; html: string };
export type PageFAQ = { q: string; a: string };
export type PageContent = {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  sections: PageSection[];
  ctas: PageCTA[];
  faqs: PageFAQ[];
};

export const pageContent: Record<string, PageContent> = {
  "/buyers/first-time-buyers": {
    "metaTitle": "First-Time Buyers in Brentwood, CA | The Mashore Group",
    "metaDescription": "Buying your first home in Brentwood: what you can actually afford, which houses to skip, and every step explained before you have to decide anything.",
    "h1": "First-time buyers",
    "primaryKeyword": "first time home buyer brentwood ca",
    "secondaryKeywords": [
      "first home brentwood",
      "first time buyer east contra costa",
      "buying first house california"
    ],
    "sections": [
      {
        "heading": "Nobody explains the part that actually matters",
        "html": "<p>First-time buyers are not short on listings. They are short on someone telling them the truth about each one. Which house has a roof at the end of its life. Which street is quieter than it looks on a Tuesday afternoon. Which asking price is optimistic and which is fair.</p><p>That is the gap we fill, and it is why the early part of this goes slower than you might expect. Rushing a first purchase is how people end up house-poor with a commute they resent and a payment that leaves nothing for the rest of their life.</p><p>You are allowed to take your time. You are also allowed to ask questions that feel obvious. Most of them are not obvious, and the people who act like they are have usually forgotten what it was like to not know.</p>"
      },
      {
        "heading": "What you can actually afford, which is not what you are approved for",
        "html": "<p>These are two different numbers and the gap between them ends marriages. A lender tells you the maximum they will lend. That figure assumes you want to spend every available dollar on housing, which almost nobody does once they are living in it.</p><p>We work backwards instead. What do you want your month to feel like? What are you saving for besides this? What happens if one income pauses for six months? The answer to those questions produces a number that is usually lower than the approval and considerably more comfortable to live inside.</p><p>Then we introduce you to local lenders who answer their phone during escrow, which matters more than the rate difference people obsess over. A quarter point is worth less than a lender who returns a call on a Friday when a deadline is Monday.</p>"
      },
      {
        "heading": "How The Mashore Group works with first-time buyers",
        "html": "<p><a href=\"/\">The Mashore Group</a> has sold in Brentwood for more than two decades. For a first purchase, most of what we add early is subtraction: telling you which houses are not worth your Saturday and why.</p><p>Krista Mashore walks properties before forming an opinion on them, which means what you hear about a house comes from someone who stood in it rather than from a listing description. When something is wrong with a place, you hear it plainly, including when that ends a transaction we would have been paid for.</p><p>Referrals are most of our business. That only works if the advice held up a year later, which is a useful thing to know about the incentives of whoever is advising you.</p>"
      },
      {
        "heading": "Our process, step by step",
        "html": "<p>Financing first, with a real number rather than an assumed one. Then neighborhoods, because Brentwood is genuinely two markets and choosing between them narrows everything. Then touring, tightly, with honest reads on each house.</p><p>When the right one appears, an offer built around what the seller actually needs. That is frequently timing or certainty rather than the highest number, and knowing which lever to pull is worth more than bidding blind and hoping.</p><p>Then inspections, appraisal, and contingency removal. Every deadline gets explained as it arrives rather than emailed to you as a calendar and left there. An inspection is not a formality and the findings are negotiable, which surprises most first-time buyers and saves them real money.</p>"
      },
      {
        "heading": "What first-time buyers in Brentwood should know specifically",
        "html": "<p>Much of Brentwood was built in the last twenty-five years, which is genuinely good news for a first purchase. Newer construction typically means fewer immediate repairs, and when your savings have gone into the down payment, not needing a new roof in year one matters enormously.</p><p>The trade is the commute. Highway 4 west, with eBART connecting at Antioch. Everyone here made that trade deliberately and most are happy with it, but it needs to be a decision rather than something you discover in month three.</p><p>Lot position is the thing first-time buyers most consistently underestimate. Backing to open space or sitting on a court is worth real money when you sell, and it costs less to prioritise now than to wish for later.</p><p>Read more <a href=\"/areas/brentwood\">about Brentwood</a>, see <a href=\"/areas/brentwood/first-time-buyers\">first-time buyers in Brentwood</a>, or <a href=\"/contact\">just ask us a question</a>. There is no obligation and no pressure.</p>"
      }
    ],
    "ctas": [
      {
        "text": "Find out what your home is worth",
        "placement": "primary"
      },
      {
        "text": "Talk it through first",
        "placement": "secondary"
      }
    ],
    "faqs": [
      {
        "q": "How much do I need for a down payment?",
        "a": "Less than most first-time buyers assume, depending on the loan programme. We put you with a local lender before you tour anything so the figure is real rather than a guess from the internet."
      },
      {
        "q": "Should I buy a newer or older home?",
        "a": "In Brentwood, newer construction usually means fewer immediate repairs, which helps when savings are already stretched. Older homes near downtown can be better value when the updates have genuinely been done."
      },
      {
        "q": "What if I find something wrong at inspection?",
        "a": "That is what inspections are for, and the findings are negotiable. We walk you through what is normal for the age of the house and what genuinely should change the deal."
      }
    ]
  },
  "/buyers/relocation": {
    "metaTitle": "Relocating to Brentwood, CA | The Mashore Group",
    "metaDescription": "Moving to Brentwood from somewhere else? How to choose a neighborhood you have never lived in, tour remotely, and time a move around a job start date.",
    "h1": "Relocating to Brentwood",
    "primaryKeyword": "relocating to brentwood ca",
    "secondaryKeywords": [
      "moving to brentwood california",
      "relocation realtor brentwood",
      "move to east contra costa"
    ],
    "sections": [
      {
        "heading": "Choosing a street you have never stood on",
        "html": "<p>Relocation buyers face a problem local buyers do not. You are making a large, slow-to-reverse decision about a place you have experienced for a weekend, if that. Listing photos are designed to sell. Maps do not tell you which route is a nightmare at eight in the morning.</p><p>So the job changes. Less showing you houses, more orienting you to the place well enough that you can judge houses yourself. That means honest description of neighborhoods including their downsides, because a relocation that goes wrong is expensive in a way a local mistake usually is not.</p>"
      },
      {
        "heading": "How The Mashore Group handles a move from out of the area",
        "html": "<p><a href=\"/\">The Mashore Group</a> has worked Brentwood for more than two decades. For relocation that tenure matters more than usual, because you are relying entirely on somebody else's knowledge of the ground.</p><p>We will tell you plainly which parts of Brentwood suit what you have described and which do not, including when the honest answer is that Brentwood is the wrong city for your commute and you should be looking closer in. That has cost us transactions. It is also why people send us their colleagues when the next person transfers.</p><p>Krista Mashore walks properties before forming a view, so what you hear about a house is first-hand rather than assembled from a listing.</p>"
      },
      {
        "heading": "Touring when you do not live here yet",
        "html": "<p>Remote touring works when it is done properly and is worthless when it is not. A walkthrough video shot to sell tells you nothing. A video shot to inform tells you about the road noise, the neighbour's extension, the way the afternoon sun hits the back of the house, and the state of the roof.</p><p>We shoot the second kind, and we answer the questions you would ask if you were standing there. When you do visit, the trip is spent efficiently on a short list rather than a broad tour, because relocation buyers usually get one or two visits rather than twelve Saturdays.</p>"
      },
      {
        "heading": "Timing the move around a job",
        "html": "<p>Most relocations run on a start date somebody else chose, which compresses everything. The order that works is financing early, neighborhood decision early, then a focused search rather than a leisurely one.</p><p>We are candid about what is achievable in your window. If the timeline is genuinely too tight to buy well, renting for a few months and buying from inside the area is frequently the better decision, and we will say so even though it delays our own transaction. Buying badly under time pressure costs far more than a short lease.</p>"
      },
      {
        "heading": "What people moving to Brentwood should understand",
        "html": "<p>Brentwood is at the eastern edge of the Bay Area. That position is the whole trade: more house and more land than the cities west of it, at the cost of a Highway 4 commute that everyone here has made peace with in one way or another. eBART connects at Antioch for onward travel.</p><p>The agricultural edges are real, not decorative. Working orchards ring the town and the u-pick season is part of the local calendar. Downtown along Oak Street is genuinely walkable, which is rarer out here than people expect.</p><p>Families come for schools and space. It is not a nightlife town and does not pretend to be. If that description fits what you are looking for, it fits very well. If it does not, better to know now.</p><p>Read the <a href=\"/areas/brentwood\">Brentwood guide</a>, see <a href=\"/areas/brentwood/relocation\">relocating to Brentwood</a>, or <a href=\"/contact\">tell us where you are moving from</a>.</p>"
      }
    ],
    "ctas": [
      {
        "text": "Find out what your home is worth",
        "placement": "primary"
      },
      {
        "text": "Talk it through first",
        "placement": "secondary"
      }
    ],
    "faqs": [
      {
        "q": "Can I buy before I move here?",
        "a": "Yes, and plenty of people do. It requires more thorough remote touring and more honest description than a local purchase, which is exactly what we set up for relocation clients."
      },
      {
        "q": "Should I rent first?",
        "a": "Sometimes, and we will say so when we think it. If your timeline is too compressed to buy well, a short lease usually costs less than a purchase made under pressure."
      },
      {
        "q": "How is the commute from Brentwood?",
        "a": "Highway 4 west, with eBART at Antioch. It is the trade everyone here makes for space, and it is worth being honest with yourself about your actual week before you commit."
      }
    ]
  },
  "/sellers/divorce-home-sale": {
    "metaTitle": "Selling a House During Divorce in Brentwood | The Mashore Group",
    "metaDescription": "Selling a home during a divorce means two owners who have to agree, usually on someone else's deadline. Handled neutrally, privately, and without taking a side.",
    "h1": "Selling a house during divorce",
    "primaryKeyword": "selling a house during divorce brentwood",
    "secondaryKeywords": [
      "divorce home sale california",
      "sell house divorce contra costa",
      "divorce realtor brentwood"
    ],
    "sections": [
      {
        "heading": "Two owners, one deadline, and nobody enjoying it",
        "html": "<p>This is the hardest sale in residential real estate and it has almost nothing to do with the house. Two people who are no longer aligned have to make a series of joint financial decisions, frequently on a timeline a court or an attorney set for them.</p><p>Most agents are not built for it. They are used to one client with one set of interests, and they instinctively align with whoever called them first. That instinct is exactly wrong here, and it turns a difficult sale into a hostile one.</p><p>The house is usually the largest asset in the marriage. Getting it wrong is expensive in a way that outlasts the divorce by years.</p>"
      },
      {
        "heading": "Think of the agent as a mediator, not a salesperson",
        "html": "<p>That is the whole approach and it is not a slogan. <a href=\"/\">The Mashore Group</a> works this kind of sale by staying genuinely neutral, communicating the same information to both parties at the same time, and refusing to become anybody's ally against the other person.</p><p>In practice that means both of you hear the same number, the same recommendation, and the same bad news simultaneously. No side conversations. No relaying messages. When one party asks what the other said, the answer is that you should both be on the call.</p><p>Krista Mashore has sold in Brentwood for more than two decades and has handled these before. That experience shows up mostly as knowing what not to do: not taking a side, not pushing a decision faster than the two of you can make it, and not pretending the emotional part is irrelevant to the financial one.</p>"
      },
      {
        "heading": "What has to happen, and in what order",
        "html": "<p>First, establish who has authority to decide what. Sometimes both signatures are required for everything. Sometimes an attorney or a court order governs. Getting this clear at the start prevents a collapse at week six when it turns out one party never agreed to the price.</p><p>Then a walkthrough and an honest number, delivered to both of you together. Then the repair conversation, which is frequently contentious because it involves spending shared money, so we keep the list short and defensible: what a buyer notices immediately, what would fail inspection, nothing else.</p><p>Then preparation, photography once the house is ready, and launch. Then offers, reviewed jointly. Disclosure gets handled properly and completely, because in a contested sale an omitted disclosure becomes a weapon later.</p>"
      },
      {
        "heading": "Privacy, disclosure, and the things people get wrong",
        "html": "<p>Nothing about your situation goes in the listing. Buyers do not need to know why a house is for sale, and telling them weakens your position. The marketing describes the house.</p><p>Disclosure is different and non-negotiable. What must be disclosed about the property gets disclosed, fully, regardless of how the sale came about. People occasionally hope that a contested situation gives room to be vague. It does the opposite.</p><p>The most common mistake is one party trying to use the sale as leverage in the wider settlement, usually by refusing a reasonable offer. That rarely works and reliably costs both of you money, and we will say so plainly to whichever of you is doing it.</p><p>See <a href=\"/areas/brentwood/divorce-home-sale\">divorce sales in Brentwood</a>, or <a href=\"/contact\">start with a conversation</a>. It stays private.</p>"
      }
    ],
    "ctas": [
      {
        "text": "Find out what your home is worth",
        "placement": "primary"
      },
      {
        "text": "Talk it through first",
        "placement": "secondary"
      }
    ],
    "faqs": [
      {
        "q": "Do you take sides?",
        "a": "No, and that is the point. Both parties get the same information at the same time. We do not relay messages or hold side conversations, because that is how these sales turn hostile."
      },
      {
        "q": "Does the buyer find out about the divorce?",
        "a": "Not from us. Nothing about your circumstances goes in the listing or the marketing. Property disclosures are a separate obligation and those are handled fully."
      },
      {
        "q": "What if we cannot agree on a price?",
        "a": "It happens, and it is usually resolved by both of you hearing the same evidence rather than each hearing a different version. Where a court or attorney governs the decision, we work within that."
      }
    ]
  },
  "/sellers/downsizing": {
    "metaTitle": "Downsizing in Brentwood, CA | The Mashore Group",
    "metaDescription": "Moving to less house in Brentwood: sequencing the sale and the next place, what to do with everything, and a timeline nobody is rushing you through.",
    "h1": "Downsizing",
    "primaryKeyword": "downsizing brentwood ca",
    "secondaryKeywords": [
      "empty nester home sale",
      "downsizing east contra costa",
      "selling family home brentwood"
    ],
    "sections": [
      {
        "heading": "The house is the easy part",
        "html": "<p>Most downsizing conversations spend ten minutes on the sale and two hours on everything else. What happens to thirty years of belongings. Whether the kids want the furniture, which they usually do not. Where you go next and whether it will feel like enough.</p><p>Those are the real obstacles and pretending otherwise does not help. Plenty of people who genuinely want to downsize stall for years, not because the numbers do not work but because the sorting feels impossible.</p><p>So we start there rather than with a list price.</p>"
      },
      {
        "heading": "How The Mashore Group handles a downsizing move",
        "html": "<p><a href=\"/\">The Mashore Group</a> works these on your timeline, not ours. Krista Mashore has sold in Brentwood for more than two decades and has walked a lot of families through this particular transition.</p><p>Practically that means no pressure to list before you are ready, and honest sequencing advice about whether to sell first or buy first. Both work and both carry risk. Which one suits you depends on your equity, whether you need the proceeds to buy, and frankly how much uncertainty you can tolerate for a few weeks at this stage of life.</p><p>We will also tell you when waiting is right. If the market and your timeline both allow another year and that year makes the transition easier, that is a legitimate answer.</p>"
      },
      {
        "heading": "What to do with everything",
        "html": "<p>This is where people get stuck, so we are specific. Sort into four: keep, family, sell, donate. Do the easy rooms first to build momentum, and leave the garage and the loft for when you have practice.</p><p>The furniture rarely goes to the children. That is a common and painful surprise, and it is better absorbed early than during a week when the movers are booked. Estate sale companies and donation services handle volume well and we can point you at ones people have had good experiences with.</p><p>Staging a downsizing sale is genuinely easier once the sorting has started, because emptier rooms photograph better and read larger. The work you do for your own sake also improves the sale, which is a rare alignment.</p>"
      },
      {
        "heading": "Sequencing, and what Brentwood specifically offers",
        "html": "<p>Brentwood has less small-format inventory than buyers expect. It is a city of family houses on decent lots, so the single-level, lower-maintenance home a downsizer actually wants is in shorter supply than the four-bedroom they are leaving. That imbalance is worth knowing months ahead rather than discovering it after your house sells.</p><p>It also means your current home is a desirable product. Families are the buyer pool here, and a well-kept family house on a good lot is exactly what they are looking for, which strengthens your position.</p><p>See the wider process on <a href=\"/sellers/selling-your-home\">selling your home</a>, the local version on <a href=\"/areas/brentwood/downsizing\">downsizing in Brentwood</a>, or <a href=\"/contact\">start with a conversation</a> and no timeline at all.</p>"
      }
    ],
    "ctas": [
      {
        "text": "Find out what your home is worth",
        "placement": "primary"
      },
      {
        "text": "Talk it through first",
        "placement": "secondary"
      }
    ],
    "faqs": [
      {
        "q": "Should I sell first or buy first?",
        "a": "Both work and both carry risk. It depends on your equity, whether you need the proceeds to buy, and how much uncertainty you can live with. We map it with your actual numbers before you commit to either."
      },
      {
        "q": "Is there anything smaller to buy in Brentwood?",
        "a": "Less than people expect. It is a city of family homes on decent lots, so single-level and lower-maintenance options are in shorter supply. Worth planning around early."
      },
      {
        "q": "How long does downsizing take?",
        "a": "Longer than a normal sale, usually because of the sorting rather than the market. We work on your timeline and will tell you honestly if waiting a season makes it easier."
      }
    ]
  }
};

export function getPageContent(path: string): PageContent | undefined {
  return pageContent[path];
}
