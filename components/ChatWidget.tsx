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
// The bubble floats up slowly enough to be seen travelling (at 0.7s it looked
// like it simply appeared at the top), then floats back down to the corner.
const RISE_MS = 3000;
const SHRINK_DURATION_MS = 1600;

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
    // Start talking once it has arrived, not while it is still rising.
    schedule(() => setIntroPhase("typing"), INTRO_START_DELAY + RISE_MS);

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

  const launchRef = useRef<HTMLButtonElement>(null);
  const skinRef = useRef<HTMLSpanElement>(null);
  useBubblePhysics(launchRef, skinRef, introActive);

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
        // Rising: vertical and horizontal travel on different durations and
        // curves, so the path arcs the way a floating bubble drifts instead of
        // running along a ruler. Returning to the corner is a gentler glide.
        style={{
          transition: introVisible
            ? // Soft lift-off, steady climb, gentle arrival. An ease-out curve
              // covered a third of the distance in the first 0.4s, which read
              // as a jump rather than a float.
              `top ${RISE_MS}ms cubic-bezier(0.42, 0, 0.35, 1), right ${RISE_MS + 700}ms cubic-bezier(0.5, 0, 0.5, 1)`
            : `top ${SHRINK_DURATION_MS}ms cubic-bezier(0.45, 0, 0.2, 1), right ${SHRINK_DURATION_MS - 200}ms cubic-bezier(0.45, 0, 0.55, 1)`,
        }}
        className={`fixed z-50 flex items-start gap-4 ${
          introVisible
            ? // On a phone the intro sits in the corner like the resting state.
              // Anchored in the hero it covered the eyebrow and the first two
              // lines of the H1 on a 375px screen: a 208px bubble over a 375px
              // viewport hides the one thing the page is trying to say.
              "top-[calc(100dvh-84px)] right-5 sm:top-32 sm:right-10 md:right-16"
            : "top-[calc(100dvh-84px)] right-5"
        }`}
      >
        {introPhase === "typing" && (
          <div
            role="button"
            tabIndex={0}
            onClick={openFromIntro}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openFromIntro()}
            className="soap-note orb-bubble-enter hidden max-w-[13rem] cursor-pointer sm:block rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed sm:max-w-[16rem]"
          >
            {INTRO_MESSAGE.slice(0, typedChars)}
            {typedChars < INTRO_MESSAGE.length && (
              <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-white/70 align-text-bottom" />
            )}
          </div>
        )}

        {/* A soap bubble in both states: large while it introduces itself,
            small in the corner afterwards (globals.css, .soap-bubble). The skin
            is its own layer so motion can push it out of round. */}
        <button
          ref={launchRef}
          onClick={() => (introActive ? openFromIntro() : setOpen((o) => !o))}
          aria-label="Chat"
          // It grows as it rises and shrinks as it settles, over the same
          // stretch of time as the travel, rather than popping to size.
          style={{
            transition: introVisible
              ? `width ${RISE_MS - 200}ms cubic-bezier(0.42, 0, 0.35, 1), height ${RISE_MS - 200}ms cubic-bezier(0.42, 0, 0.35, 1), transform 0.5s ease`
              : `width ${SHRINK_DURATION_MS - 300}ms cubic-bezier(0.45, 0, 0.2, 1), height ${SHRINK_DURATION_MS - 300}ms cubic-bezier(0.45, 0, 0.2, 1), transform 0.5s ease`,
          }}
          className={`soap-launch flex shrink-0 items-center justify-center text-2xl ${
            introVisible ? "orb-blob h-24 w-24 sm:h-28 sm:w-28" : "h-16 w-16"
          }`}
        >
          <span ref={skinRef} className="soap-bubble" aria-hidden />
          <span className="soap-icon">
            {introVisible ? null : open ? <Close size={24} aria-hidden /> : <Chat size={24} aria-hidden />}
          </span>
        </button>
      </div>
    </>
  );
}

/**
 * A soap bubble moving through air.
 *
 * Every frame this measures how fast the launcher is travelling and in which
 * direction, and pushes its skin out of round in proportion: flattened along
 * the direction of travel, widened across it, the way air resistance shapes a
 * real bubble. The shape sits on an underdamped spring, so when the bubble
 * stops it overshoots, wobbles a few times with each swing smaller, and comes
 * to rest as a perfect circle.
 *
 * It only runs while something could be moving (the intro, and briefly after
 * it or a resize), then stops and leaves the skin untouched. Nothing runs for
 * anyone who has asked for reduced motion.
 */
function useBubblePhysics(
  launchRef: React.RefObject<HTMLButtonElement | null>,
  skinRef: React.RefObject<HTMLSpanElement | null>,
  active: boolean
) {
  const activeRef = useRef(active);
  const startRef = useRef<() => void>(() => {});
  activeRef.current = active;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const STIFFNESS = 170; // how hard the film pulls back to round
    const DAMPING = 8; // low, so it wobbles a few times before settling
    // At most ~8% flatter along the direction of travel (about 16% out of
    // round with the widening). 17% measured 34-50% out of round in motion,
    // which read as a blob rather than a bubble.
    const MAX_SQUASH = 0.08;
    const STRETCH_ACROSS = 0.85; // how much it widens as it flattens

    let raf = 0;
    let running = false;
    let lastTime = 0;
    let lastX = 0;
    let lastY = 0;
    let primed = false;
    let squash = 0; // + flattened along the axis, - stretched along it
    let squashVelocity = 0;
    let axis = 0; // direction of travel, radians
    let stillFor = 0;

    const tick = (now: number) => {
      const button = launchRef.current;
      const skin = skinRef.current;
      if (!button || !skin) {
        running = false;
        return;
      }
      const r = button.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const dt = primed ? Math.min(0.05, (now - lastTime) / 1000) : 0;

      let speed = 0;
      if (dt > 0) {
        const vx = (x - lastX) / dt;
        const vy = (y - lastY) / dt;
        speed = Math.hypot(vx, vy);
        if (speed > 30) {
          // Turn the axis smoothly toward the direction of travel. A squash is
          // symmetric, so an axis and its opposite are the same shape.
          let d = Math.atan2(vy, vx) - axis;
          d = ((d + Math.PI / 2) % Math.PI + Math.PI) % Math.PI - Math.PI / 2;
          axis += d * Math.min(1, dt * 10);
        }
        // Square root: a slow drift still reads, a fast glide does not tear it.
        const target = Math.min(MAX_SQUASH, Math.sqrt(speed) * 0.004);
        const accel = STIFFNESS * (target - squash) - DAMPING * squashVelocity;
        squashVelocity += accel * dt;
        squash += squashVelocity * dt;
      }
      lastX = x;
      lastY = y;
      lastTime = now;
      primed = true;

      const settled = Math.abs(squash) < 0.001 && Math.abs(squashVelocity) < 0.004 && speed < 2;
      if (settled) {
        skin.style.transform = "";
        stillFor += dt;
      } else {
        stillFor = 0;
        skin.style.transform = `rotate(${axis}rad) scale(${1 - squash}, ${1 + squash * STRETCH_ACROSS}) rotate(${-axis}rad)`;
      }

      if (!activeRef.current && stillFor > 0.6) {
        running = false;
        primed = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      stillFor = 0;
      raf = requestAnimationFrame(tick);
    };
    startRef.current = start;
    start();
    // The corner position is tied to the viewport height, so a resize moves
    // the bubble; let it react to that too.
    window.addEventListener("resize", start);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", start);
    };
  }, [launchRef, skinRef]);

  // Wake the loop whenever the intro starts or ends (the glide to the corner).
  useEffect(() => {
    startRef.current();
  }, [active]);
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
