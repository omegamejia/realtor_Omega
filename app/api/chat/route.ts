import { NextResponse } from "next/server";
import { site } from "@/site.config";
import { buildKnowledge } from "@/lib/knowledge";
import {
  clientIp,
  isRateLimited,
  withinDailyBudget,
  rateLimitDurable,
} from "@/lib/ratelimit";

/**
 * POST /api/chat — the on-site assistant (RAG over the whole site).
 *
 * The site's real content (business, team, areas, services, listings, pages,
 * blog) is assembled into a knowledge base and passed to Claude, so answers come
 * from THIS site, not general knowledge. The knowledge block is cached at the API
 * (prompt caching) so repeat messages are cheap.
 *
 * KEY: uses ANTHROPIC_API_KEY from the environment — the AGENT'S OWN key, set as a
 * Vercel env var during setup. It is NEVER hardcoded and NEVER a shared/agency key.
 * With no key, the widget still runs in seed mode (points visitors to phone/contact).
 *
 * GET /api/chat returns whether it's configured + how much knowledge was built —
 * a no-key way to verify RAG during setup.
 */

// Static content → build the knowledge base once per instance.
const KNOWLEDGE = buildKnowledge();

const INSTRUCTIONS = [
  `You are the friendly website assistant for ${site.brand.logoText}, a real estate business.`,
  `Answer ONLY from the SITE KNOWLEDGE provided.`,
  `STYLE (follow exactly):`,
  `- Keep every reply SHORT. Make one point, distilled to the essentials. Do not dump everything at once.`,
  `- It is better to answer briefly and ask for more than to try to cover everything. Keep it a back and forth.`,
  `- Break the reply into small chunks: short paragraphs separated by a blank line. Never one big block.`,
  `- Plain simple text only. Do NOT use em dashes, asterisks, markdown, bullet symbols, or emoji. Use normal sentences and periods.`,
  `CONVERSATION FLOW (important):`,
  `- Open confidently and positively. If they ask about something that has no dedicated page but the business does do it, just help. NEVER begin with a disclaimer or with what you do not have (no "I don't have a specific page for that"). Lead straight with the helpful, positive answer.`,
  `- Pace it like a real conversation. On their first one or two messages, answer in just a sentence or two and ask ONE open-ended question to understand them. Do NOT dump lots of info and do NOT give a big call to action yet.`,
  `- Once you understand what they actually want (usually after a couple of exchanges), THEN make one concrete suggestion and give one clear next step: a free valuation at /sellers/home-valuation, the most relevant page, or talking to the team at /contact or ${site.agent.phone}.`,
  `- Ask at most two clarifying questions total. NEVER repeat a question or loop back to an earlier one. When you have enough, recommend and guide toward contacting the team instead of asking more.`,
  `- When in doubt, say less and ask one good question. Short chunks, real back and forth.`,
  `LINKS: to point to a page, write ONLY its on-site path exactly like /contact or /listings or /sellers/home-valuation. Never write a full web address, never write https://, never invent a domain name.`,
  `If the answer isn't in the knowledge, say so briefly and point them to /contact or ${site.agent.phone}.`,
  `Never invent prices, stats, listings, or availability. No legal or financial advice.`,
].join("\n");

/**
 * Deterministic cleanup so no funny characters ever reach the visitor, no matter
 * what the model outputs: em/en dashes, curly quotes, ellipsis, emoji, and stray
 * markdown. Markdown links are converted so the bare on-site path survives (the
 * widget linkifies it).
 */
function sanitize(text: string): string {
  return text
    // [label](/path) -> "label /path" ; [label](http...) -> "label"
    .replace(
      /\[([^\]]+)\]\((?:https?:\/\/[^)]*)?(\/[^)\s]*)?\)/g,
      (_m, label, path) => (path ? `${label} ${path}` : label)
    )
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*/g, "") // stray asterisks / bullets
    .replace(/\s*[—–]\s*/g, ", ") // em/en dash -> comma
    .replace(/[‘’]/g, "'") // curly single quotes
    .replace(/[“”]/g, '"') // curly double quotes
    .replace(/…/g, "...") // ellipsis
    .replace(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}️]/gu,
      ""
    ) // emoji / dingbats / symbol arrows
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Per-IP limit + a daily spend ceiling. Both are durable when Upstash is set
// (see lib/ratelimit); otherwise best-effort in-memory. The daily cap is the
// real backstop: it keeps this public page from running up unbounded Anthropic
// spend even if the per-IP limit is bypassed via IP rotation.
const CHAT_MAX_PER_MIN = 8;
const CHAT_DAILY_MAX = Number(process.env.CHAT_DAILY_MAX) || 2000;

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({
    configured: !!key,
    knowledgeChars: KNOWLEDGE.length,
    rateLimitDurable,
    preview: KNOWLEDGE.slice(0, 300),
  });
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await isRateLimited(`chat:${ip}`, CHAT_MAX_PER_MIN, 60)) {
    return NextResponse.json(
      { reply: "You're sending messages quickly — give it a moment and try again." },
      { status: 429 }
    );
  }

  let messages: { role: string; content: string }[] = [];
  try {
    const body = await req.json();
    const raw = Array.isArray(body.messages)
      ? body.messages
      : body.message
        ? [{ role: "user", content: body.message }]
        : [];
    messages = raw
      .filter(
        (m: { role?: string; content?: unknown }) =>
          (m?.role === "user" || m?.role === "assistant") &&
          typeof m?.content === "string" &&
          m.content.trim()
      )
      .map((m: { role: string; content: string }) => ({
        role: m.role,
        content: String(m.content).slice(0, 2000),
      }))
      .slice(-16);
    // Anthropic requires the first message to be from the user.
    while (messages.length && messages[0].role !== "user") messages.shift();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!messages.length) {
    return NextResponse.json({ error: "Empty message." }, { status: 422 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({
      reply: `Chat isn't connected yet. In the meantime, call ${site.agent.phone} or use the contact page and ${site.agent.name} will get right back to you.`,
      mode: "seed",
    });
  }

  // Daily spend ceiling. Once the site passes CHAT_DAILY_MAX messages for the
  // day, fall back to seed mode instead of paying for more — a hard backstop
  // against cost abuse that the per-IP limit alone can't guarantee.
  if (!(await withinDailyBudget("chat", CHAT_DAILY_MAX))) {
    return NextResponse.json({
      reply: `Thanks for your patience — chat is taking a quick break for the day. Call ${site.agent.phone} or use /contact and ${site.agent.name} will get right back to you.`,
      mode: "seed",
    });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: [
          { type: "text", text: INSTRUCTIONS },
          {
            type: "text",
            text: `SITE KNOWLEDGE:\n${KNOWLEDGE}`,
            // Cache the (stable) knowledge block so repeat chats are cheap.
            cache_control: { type: "ephemeral" },
          },
        ],
        messages,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("[chat] Anthropic error:", res.status, detail);
      return NextResponse.json(
        { reply: `Sorry, I had trouble answering. Please call ${site.agent.phone}.` },
        { status: 502 }
      );
    }
    const data = await res.json();
    const raw =
      data?.content?.[0]?.text?.trim() ||
      `Please reach out via /contact and ${site.agent.name} will help.`;
    return NextResponse.json({ reply: sanitize(raw), mode: "live" });
  } catch (err) {
    console.error("[chat] request failed:", err);
    return NextResponse.json(
      { reply: `Sorry, something went wrong. Please call ${site.agent.phone}.` },
      { status: 502 }
    );
  }
}
