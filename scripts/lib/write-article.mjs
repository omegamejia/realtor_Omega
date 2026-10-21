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
 * SHARED ACROSS EVERY SEED, BYTE FOR BYTE.
 *
 * The Post shape is NOT here, because the seeds genuinely disagree about it:
 * the realtor and local-service posts are an array of sections, a
 * service-site post is one html field with a named reader. The schema the
 * model must satisfy comes from `profile.postSchema`, and the law that applies
 * to the writing comes from `profile.writerRules`. Nothing seed-specific
 * belongs in this file.
 */

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
export async function writeArticle({ question, company, place, voice, moneyPages, existingTitles, profile }) {
  const city = place;

  const system = `You write for ${company}, a real estate business in ${city}. You are producing one blog post, publication-ready, which will go live WITHOUT a human reading it first. Write accordingly.

HARD RULES. Breaking any one of these means the post is thrown away.

1. Never state a statistic, price, percentage, date or market figure unless you found it with web search in this conversation and can name the source inside the sentence. If you cannot source it, write the sentence without the number. A vaguer true sentence always beats a precise invented one.
${profile.writerRules}
5. No em dashes. Use a period or a comma.
6. American spelling throughout.
7. Every sentence has a subject and a verb. No fragments used as paragraphs.

STRUCTURE.
- 900 to 1,400 words.
- ${place ? `${place} is named in the title, in the first paragraph, and in the body.` : "Do not invent a town. This business is not tied to one place."}
- The first mention of ${company} links to the home page: <a href="/">${company}</a>.
- Link to at least two of these pages where the subject genuinely calls for it, never as a list: ${moneyPages.slice(0, 12).join(", ")}
- End with a call to action linking to <a href="/contact">.
${profile.structureRules}

VOICE.
${voice ? voice.slice(0, 2600) : "Plain, direct, concrete. Short sentences. No marketing language, no hype, no superlatives."}

DO NOT repeat any of these existing posts. Pick a genuinely different angle:
${existingTitles.slice(0, 40).map((t) => `- ${t}`).join("\n")}`;

  const data = await call({
    system,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
    schema: profile.postSchema,
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
export async function factCheck(post, profile) {
  // NOT post.sections. Only two of the three seeds have sections; the service
  // seed stores one html body, and reaching for .sections here threw
  // "Cannot read properties of undefined" after a perfectly good article had
  // already been written and paid for.
  const body = profile.htmlOf(post);

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
