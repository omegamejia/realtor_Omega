"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { site } from "@/site.config";
import { Close, Chat } from "@/components/Icons";

type Msg = { role: "user" | "assistant"; text: string };

const INTRO_MESSAGE =
  `Hey, I'm kind of an expert around here. Need help finding what you're ` +
  `looking for, or have a question about who we are or what we do? I'll be ` +
  `right here in the corner.`;

const INTRO_SEEN_KEY = "chatIntroSeen";
const INTRO_START_DELAY = 1000; // let the hero settle first
const TYPE_SPEED_MS = 24; // per character
const READ_HOLD_MS = 2200; // pause after typing finishes, before shrinking
const SHRINK_DURATION_MS = 700;

type IntroPhase = "off" | "entering" | "typing" | "shrinking";

/**
 * Floating on-site chat widget. Talks to /api/chat, which answers from this
 * site's own data (works live when the owner sets ANTHROPIC_API_KEY; otherwise
 * returns a helpful "call us" message).
 *
 * On a visitor's first look at the homepage, the launcher introduces itself:
 * a floating orb drifts up with a speech bubble that types out a greeting,
 * holds a beat, then shrinks into its normal bottom-right resting spot. Skips
 * itself on repeat visits (sessionStorage), on any page but "/", and for
 * anyone with reduced-motion set.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", text: `Hi! Ask me anything about ${site.brand.logoText}.` },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const pathname = usePathname();
  const [introPhase, setIntroPhase] = useState<IntroPhase>("off");
  const [typedChars, setTypedChars] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (pathname !== "/") return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(INTRO_SEEN_KEY)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timers.current.push(t);
      return t;
    };

    schedule(() => setIntroPhase("entering"), INTRO_START_DELAY);
    schedule(() => setIntroPhase("typing"), INTRO_START_DELAY + 250);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    // Only ever arm this once per mount on the homepage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Type out the greeting one character at a time, then hold, then shrink.
  useEffect(() => {
    if (introPhase !== "typing") return;
    if (typedChars >= INTRO_MESSAGE.length) {
      const t = setTimeout(() => setIntroPhase("shrinking"), READ_HOLD_MS);
      timers.current.push(t);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTypedChars((n) => n + 1), TYPE_SPEED_MS);
    timers.current.push(t);
    return () => clearTimeout(t);
  }, [introPhase, typedChars]);

  // Once shrunk, settle into the normal launcher and remember not to replay.
  useEffect(() => {
    if (introPhase !== "shrinking") return;
    const t = setTimeout(() => {
      setIntroPhase("off");
      sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    }, SHRINK_DURATION_MS);
    timers.current.push(t);
    return () => clearTimeout(t);
  }, [introPhase]);

  function skipIntro() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setIntroPhase("off");
    if (typeof window !== "undefined") sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  }

  function openFromIntro() {
    skipIntro();
    setOpen(true);
  }

  // If the visitor opens the chat manually while the intro is mid-flight,
  // don't let both play at once.
  useEffect(() => {
    if (open) skipIntro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const introActive = introPhase !== "off";
  const introVisible = introPhase === "entering" || introPhase === "typing";

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    // Build the conversation history (so the assistant remembers the thread and
    // doesn't loop). Drop the leading synthetic greeting; API must start with user.
    const history = [...msgs, { role: "user" as const, text }]
      .map((m) => ({ role: m.role, content: m.text }));
    const firstUser = history.findIndex((m) => m.role === "user");
    const apiMessages = (firstUser >= 0 ? history.slice(firstUser) : history).slice(-16);

    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", text: data.reply || "Sorry, try again." }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Sorry, something went wrong." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[28rem] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-xl">
          <div className="flex items-center justify-between bg-[var(--brand)] px-4 py-3">
            <span className="text-sm font-semibold text-white">
              {site.brand.logoText}
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-white/80 hover:text-white"
            >
              <Close size={20} aria-hidden />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-[var(--brand)] text-white"
                    : "bg-[color:var(--surface-muted)] text-[color:var(--fg)]"
                }`}
              >
                {renderMessage(m.text)}
              </div>
            ))}
            {busy && <div className="text-xs text-[color:var(--fg-subtle)]">Typing…</div>}
          </div>
          <div className="border-t border-[color:var(--border)] p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type your question…"
                className="w-full rounded-md border border-[color:var(--border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              />
              <button
                onClick={send}
                disabled={busy}
                className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Launcher: a floating orb + speech bubble that opens big in the
          above-the-fold hero on first homepage visit, then glides down and
          shrinks into the normal corner button once it's said its piece.
          Anchored with top/right throughout (never bottom) so the two
          positions are on the same axis and the browser can tween between
          them smoothly. */}
      <div
        className={`fixed z-50 flex items-start gap-4 transition-all duration-700 ease-in-out ${
          introVisible
            ? "top-28 right-6 sm:top-32 sm:right-10 md:right-16"
            : "top-[calc(100dvh-76px)] right-5"
        }`}
      >
        {introVisible && (
          <div
            role="button"
            tabIndex={0}
            onClick={openFromIntro}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openFromIntro()}
            className="orb-bubble-enter max-w-[13rem] cursor-pointer rounded-2xl rounded-tr-sm bg-[color:var(--surface)] px-4 py-3 text-sm leading-relaxed text-[color:var(--fg)] shadow-xl ring-1 ring-black/5 sm:max-w-[16rem]"
          >
            {INTRO_MESSAGE.slice(0, typedChars)}
            {typedChars < INTRO_MESSAGE.length && (
              <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-neutral-400 align-text-bottom" />
            )}
          </div>
        )}

        <button
          onClick={() => (introActive ? openFromIntro() : setOpen((o) => !o))}
          aria-label="Chat"
          className={`flex shrink-0 items-center justify-center rounded-full text-2xl text-white shadow-lg backdrop-blur-md transition-all duration-700 ease-in-out hover:opacity-90 ${
            introVisible
              ? "orb-blob h-24 w-24 border border-white/50 sm:h-28 sm:w-28"
              : "h-14 w-14 bg-[var(--brand)]"
          }`}
          style={
            introVisible
              ? {
                  background: `radial-gradient(circle at 28% 24%, rgba(255,255,255,0.85), rgba(255,255,255,0) 45%), linear-gradient(135deg, ${site.brand.primaryColor}b3, ${site.brand.accentColor}b3)`,
                }
              : undefined
          }
        >
          {introVisible ? null : open ? <Close size={24} aria-hidden /> : <Chat size={24} aria-hidden />}
        </button>
      </div>
    </>
  );
}

/**
 * Renders assistant text as small chunks (paragraphs) with working links:
 * bare on-site paths like /contact become clickable, and phone numbers become
 * tel: links. Links are relative, so they work on any domain the site runs on.
 */
function renderMessage(text: string): React.ReactNode {
  const paragraphs = text
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs.map((para, pi) => (
    <p key={pi} className="mb-2 leading-relaxed last:mb-0">
      {linkify(para)}
    </p>
  ));
}

const TOKEN = /(\/[a-zA-Z][a-zA-Z0-9/_-]*|\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})/g;

function linkify(line: string): React.ReactNode[] {
  return line.split(TOKEN).map((part, i) => {
    if (!part) return null;
    if (/^\/[a-zA-Z]/.test(part)) {
      return (
        <a key={i} href={part} className="font-medium underline">
          {part}
        </a>
      );
    }
    if (/^\(?\d/.test(part) && /\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/.test(part)) {
      return (
        <a key={i} href={`tel:${part.replace(/[^0-9+]/g, "")}`} className="font-medium underline">
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
