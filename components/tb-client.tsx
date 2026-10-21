"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type Img = { src: string; alt: string };

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Full-height hero: photographs cross-fade, the active one drifts in slowly,
 * and the caption sits bottom-left under a hairline. `data-hero` is what tells
 * the header to go transparent over it.
 */
export function HeroSlideshow({
  images,
  eyebrow,
  title,
  sub,
  actions,
  interval = 7500,
  sticky = false,
}: {
  images: Img[];
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  interval?: number;
  /** Pin the photograph on desktop so the page slides up over it. */
  sticky?: boolean;
}) {
  const [active, setActive] = useState(0);
  // The photo being replaced stays fully visible, and keeps drifting, UNDER the
  // new one while it fades in. Fading both at once dipped the brightness in the
  // middle of every change, and dropping the old one's drift snapped its zoom
  // back: together that read as a jump rather than a blend.
  const [leaving, setLeaving] = useState<number | null>(null);
  const activeRef = useRef(0);

  useEffect(() => {
    if (images.length < 2 || reduced()) return;
    let clear: ReturnType<typeof setTimeout> | undefined;
    const t = setInterval(() => {
      const current = activeRef.current;
      const next = (current + 1) % images.length;
      activeRef.current = next;
      setLeaving(current);
      setActive(next);
      clearTimeout(clear);
      clear = setTimeout(() => setLeaving(null), 3200);
    }, interval);
    return () => {
      clearInterval(t);
      clearTimeout(clear);
    };
  }, [images.length, interval]);

  return (
    <section className={`tb-hero${sticky ? " tb-hero--sticky" : ""}`} data-hero="">
      <div className="tb-hero__slides" role="img" aria-label={images[0]?.alt ?? ""}>
        {images.map((img, i) => (
          <div
            key={img.src}
            aria-hidden
            className={`tb-hero__slide${
              i === active ? " is-active" : i === leaving ? " is-leaving" : ""
            }`}
            style={{ backgroundImage: `url(${img.src})` }}
          />
        ))}
      </div>
      <div className="tb-hero__caption">
        {eyebrow ? <p className="tb-hero__eyebrow">{eyebrow}</p> : null}
        <span className="tb-hero__rule" aria-hidden />
        <h1 className="tb-hero__title">{title}</h1>
        {sub ? <p className="tb-hero__sub">{sub}</p> : null}
        {actions ? <div className="tb-hero__actions">{actions}</div> : null}
      </div>
    </section>
  );
}

/**
 * A number that counts up as it arrives.
 *
 * The server renders the REAL value, so crawlers, no-JS visitors and anyone who
 * already has it on screen see the true figure. It only drops to a lower start
 * when it is below the fold at mount, and it starts counting when its top edge
 * is reached — measured on scroll rather than observed, so jumping past it with
 * an anchor still finishes the count instead of freezing it at the start.
 */
export function CountUp({
  value,
  from,
  prefix = "",
  suffix = "",
  duration = 1700,
}: {
  value: number;
  from?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    const start = from ?? Math.round(value * 0.72);
    setShown(start);
    let raf = 0;
    let ticking = false;
    let done = false;

    const run = () => {
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(Math.round(start + (value - start) * eased));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const remove = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", onScroll);
    };
    const check = () => {
      ticking = false;
      if (done) return;
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
        done = true;
        remove();
        run();
      }
    };
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(check);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onScroll);
    return () => {
      remove();
      cancelAnimationFrame(raf);
    };
  }, [value, from, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {shown.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

/** Muted, looping, inline video. Paused for anyone who asked for less motion. */
export function AutoVideo({
  src,
  poster,
  label,
}: {
  src: string;
  poster?: string;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (reduced()) ref.current?.pause();
  }, []);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={label}
    />
  );
}

/**
 * Blocks that slide up over one another as the page scrolls (desktop only;
 * the CSS lives in tb.css under "Stacking").
 *
 * Each child is made sticky, with its top set to the screen height minus its
 * own height. A block shorter than the screen pins at the top; a taller one
 * scrolls through to its last line and pins there, so the next block never
 * covers anything that has not been read. Heights are re-measured whenever a
 * block changes size, which is what keeps an opened FAQ answer in step.
 */
export function StackGroup({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = Array.from(root.children) as HTMLElement[];
    const measure = () => {
      const vh = window.innerHeight;
      for (const el of items) {
        el.style.setProperty("--stack-top", `${Math.min(0, vh - el.offsetHeight)}px`);
      }
    };
    measure();
    root.classList.add("is-ready");
    const ro = new ResizeObserver(measure);
    items.forEach((el) => ro.observe(el));
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return (
    <div ref={ref} className="tb-stack">
      {children}
    </div>
  );
}

/** One photograph at a time, cross-fading, with dots to jump between them. */
export function FadeCarousel({
  images,
  label,
  interval = 4500,
}: {
  images: Img[];
  label: string;
  interval?: number;
}) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (images.length < 2 || reduced()) return;
    const t = setInterval(() => setActive((a) => (a + 1) % images.length), interval);
    return () => clearInterval(t);
  }, [images.length, interval, active]);

  return (
    <section className="tb-carousel" aria-roledescription="carousel" aria-label={label}>
      {images.map((img, i) => (
        <figure
          key={img.src}
          className={`tb-carousel__slide${i === active ? " is-active" : ""}`}
          aria-hidden={i !== active}
        >
          <img src={img.src} alt={img.alt} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
        </figure>
      ))}
      {images.length > 1 ? (
        <div className="tb-carousel__dots">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show photo ${i + 1} of ${images.length}`}
              aria-current={i === active}
              className={i === active ? "is-active" : ""}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
