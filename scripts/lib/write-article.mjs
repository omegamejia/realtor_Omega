/**
 * Research and write one article.
 *
 * Claude with web search does the research and the writing in one call, and a
 * second call checks its own claims. There is no Perplexity here on purpose:
 * one vendor, one key, and the same key already runs the chat widget.
 *
 * STRUCTURED OUTPUT, NOT PROSE PARSING. The model returns the Post shape
 * directly via `output_config.format`. Asking for markdown and parsing it back
 * is where unattended writers break — a heading the parser did not expect
 * becomes a malformed post, and nobody is watching.
 *
 * EVERY FACTUAL CLAIM IS EITHER CITED OR CUT. Not softened, not hedged, cut.
 * `.claude/rules/legal-compliance.md` §4 makes an uncited market statistic a
 * launch blocker, and an unattended writer producing one a day is the fastest
 * way to put a licensed professional's name on a number nobody can source.
 */
const API = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ARTICLE_MODEL || "claude-opus-5-5";

/**
 * The Post shape, as a schema the model must satisfy.
 *
 * SHAPE ONLY, no validators. The API rejects `minimum`/`maximum` (and the other
 * JSON-Schema constraint keywords) inside `output_config.format.schema` — found
 * by calling it, not by reading about it. Word counts, title lengths and the
 * rest are enforced in check-article.mjs instead, which is the better place:
 * one set of rules that blocks, rather than two that can disagree.
 */
const POST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "slug", "title", "metaTitle", "metaDescription", "city", "readMinutes",
    "excerpt", "primaryKeyword", "secondaryKeywords", "sections", "related",
  ],
  properties: {
    slug: { type: "string" },
    title: { type: "string" },
    metaTitle: { type: "string" },
    metaDescription: { type: "string" },
    city: { type: "string" },
    readMinutes: { type: "integer" },
    excerpt: { type: "string" },
    primaryKeyword: { type: "string" },
    secondaryKeywords: { type: "array", items: { type: "string" } },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "html"],
        properties: {
          heading: { type: "string" },
          html: { type: "string" },
        },
      },
    },
    related: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "href"],
        properties: { label: { type: "string" }, href: { type: "string" } },
      },
    },
  },
};

async function call({ system, messages, tools, schema, maxTokens = 16000 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");

  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
    output_config: { effort: "high" },
  };
  if (tools) body.tools = tools;
  if (schema) {
    body.output_config.format = {
      type: "json_schema",
      schema,
    };
  }

  const res = await fetch(API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Claude API ${res.status}: ${detail.slice(0, 400)}`);
  }
  const data = await res.json();

  // A refusal is a 200 with a stop_reason. Reading content without checking it
  // is how a refusal becomes an empty article that publishes.
  if (data.stop_reason === "refusal") {
    throw new Error(
      `the model declined this topic (${data.stop_details?.category ?? "no category"}). ` +
        "Held back rather than published."
    );
  }
  if (data.stop_reason === "max_tokens") {
    throw new Error("the article was cut off at max_tokens. Held back rather than published.");
  }
  return data;
}

const textOf = (data) =>
  (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");

/**
 * Write the article. Web search is on, so claims can be sourced; the system
 * prompt is what keeps it from inventing any that are not.
 */
export async function writeArticle({ question, site, voice, moneyPages, existingTitles }) {
  const company = site.brand?.logoText || site.agent?.name || "";
  const city = site.location?.city || "";

  const system = `You write for ${company}, a real estate business in ${city}. You are producing one blog post, publication-ready, which will go live WITHOUT a human reading it first. Write accordingly.

HARD RULES. Breaking any one of these means the post is thrown away.

1. Never state a statistic, price, percentage, date or market figure unless you found it with web search in this conversation and can name the source inside the sentence. If you cannot source it, write the sentence without the number. A vaguer true sentence always beats a precise invented one.
2. Never write about the mechanics of the transaction: commissions, buyer agreements, closing costs, escrow, contingencies, who pays what. Those vary by state and are the agent's licence to describe, not yours.
3. Fair Housing. Describe the PROPERTY and the PLACE, never the people who live there or who would "fit". Banned outright: "great/perfect for families", "family-friendly", "safe neighborhood", "good schools", "exclusive", "ideal for young professionals". Name a school or a crime statistic with a source, or say nothing.
4. No em dashes. Use a period or a comma.
5. American spelling throughout.
6. Every sentence has a subject and a verb. No fragments used as paragraphs.

STRUCTURE.
- 900 to 1,400 words across at least four sections.
- ${city} is named in the title, in the first paragraph, and in the body.
- The first mention of ${company} links to the home page: <a href="/">${company}</a>.
- Link to at least two of these pages where the subject genuinely calls for it, never as a list: ${moneyPages.slice(0, 12).join(", ")}
- The final section ends with a call to action linking to <a href="/contact">.
- Section html is clean HTML: <p>, <ul>, <li>, <strong>, <a>. No headings inside html, no inline styles, no classes.

VOICE.
${voice ? voice.slice(0, 2600) : "Plain, direct, concrete. Short sentences. No marketing language, no hype, no superlatives."}

DO NOT repeat any of these existing posts. Pick a genuinely different angle:
${existingTitles.slice(0, 40).map((t) => `- ${t}`).join("\n")}`;

  const data = await call({
    system,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
    schema: POST_SCHEMA,
    messages: [
      {
        role: "user",
        content: `Research and write the post that answers this question, for people in and around ${city}:

"${question}"

Search for anything you intend to state as fact. Return the structured post.`,
      },
    ],
  });

  const raw = textOf(data);
  let post;
  try {
    post = JSON.parse(raw);
  } catch {
    throw new Error("the model did not return valid JSON for the post");
  }

  const searches = (data.content || []).filter(
    (b) => b.type === "web_search_tool_result"
  ).length;

  return { post, searches, usage: data.usage };
}

/**
 * Check the article against its own sources.
 *
 * A separate call, with the draft as input and search on, because a model
 * checking its own output in the same breath tends to agree with itself. This
 * one is asked only to find claims that cannot be sourced, and the article is
 * held back rather than silently edited: a wrong number quietly replaced by a
 * different wrong number is worse than a post that did not publish.
 */
export async function factCheck(post) {
  const body = post.sections.map((s) => `## ${s.heading}\n${s.html}`).join("\n\n");

  const data = await call({
    system: `You are checking a real estate article before it publishes unattended. Find every factual claim that a reader could check: statistics, prices, percentages, dates, named places, named institutions, market conditions.

For each one, search for it. Report ONLY the claims you could NOT verify, or that you found to be wrong. Say nothing about claims that check out.

Be strict about numbers and relaxed about ordinary description. "Homes near the water cost more" needs no source. "Waterfront homes sell for 23% more" does.`,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }],
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["unverified"],
      properties: {
        unverified: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["claim", "problem"],
            properties: {
              claim: { type: "string" },
              problem: { type: "string" },
            },
          },
        },
      },
    },
    messages: [{ role: "user", content: `Title: ${post.title}\n\n${body}` }],
    maxTokens: 8000,
  });

  try {
    const parsed = JSON.parse(textOf(data));
    return { unverified: parsed.unverified ?? [], usage: data.usage };
  } catch {
    // A fact-check that cannot be parsed is not a pass.
    throw new Error("the fact-check did not return readable output");
  }
}
