/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";
import { ContactForm } from "@/components/ContactForm";
import { AutoVideo, CountUp } from "@/components/tb-client";

/**
 * The section vocabulary of the redesign. Each one is a pattern, not a page:
 * a statement, a stat row, a photo strip, a split feature, a quote, a framed
 * photograph, an inquiry band. Pages are assembled from these, and every one
 * carries its own entrance motion through Reveal.
 */

type Img = { src: string; alt: string };
type LinkT = { href: string; label: string };

/** Small capitals, a large light sentence, an optional line of body, links. */
export function Statement({
  id,
  eyebrow,
  children,
  body,
  links = [],
  alt = false,
  align = "center",
  as = "p",
  band,
}: {
  id?: string;
  eyebrow?: ReactNode;
  children: ReactNode;
  body?: ReactNode;
  links?: LinkT[];
  alt?: boolean;
  align?: "center" | "left";
  /** h2 when the sentence is a section title; p when it is prose set large. */
  as?: "p" | "h2";
  /** Put the section on a light or dark band, so neighbours alternate. */
  band?: "light" | "dark";
}) {
  const Tag = as;
  return (
    <section id={id} className={`tb-section${alt ? " tb-alt" : ""}${band ? ` tb-band tb-band--${band}` : ""}`}>
      <Reveal className={`tb-boxed tb-stack ${align === "center" ? "tb-center" : "tb-left"}`}>
        {eyebrow ? <p className="tb-eyebrow tb-fade-up">{eyebrow}</p> : null}
        <Tag className="tb-statement tb-fade-up tb-d1">{children}</Tag>
        {body ? <p className="tb-body tb-fade-up tb-d2">{body}</p> : null}
        {links.length ? (
          <div className="tb-links tb-fade-up tb-d3">
            {links.map((l) => (
              <Link key={l.href + l.label} href={l.href} className="tb-link">
                {l.label}
              </Link>
            ))}
          </div>
        ) : null}
      </Reveal>
    </section>
  );
}

type Stat =
  | { value: number; from?: number; prefix?: string; suffix?: string; label: string; text?: string }
  | { word: string; label: string; text?: string };

/** Hairline-topped columns of big light numbers (or words) with small labels. */
export function StatGrid({
  id,
  eyebrow,
  title,
  stats,
  link,
  alt = false,
  band,
  tone,
}: {
  /** Light or dark band behind the numbers. */
  tone?: "light" | "dark";
  id?: string;
  eyebrow?: ReactNode;
  title?: ReactNode;
  stats: Stat[];
  link?: LinkT;
  alt?: boolean;
  /** A photograph cropped into a thin band across the top of the section. */
  band?: Img;
}) {
  return (
    <section
      id={id}
      className={`${alt ? "tb-alt" : ""}${tone ? ` tb-band tb-band--${tone}` : ""}`.trim() || undefined}
    >
      {band?.src ? (
        <Reveal className="tb-frame tb-frame--band tb-fade">
          <img src={band.src} alt={band.alt} loading="lazy" decoding="async" />
        </Reveal>
      ) : null}
      <div className="tb-section">
        <Reveal className="tb-boxed">
          {eyebrow ? <p className="tb-eyebrow tb-fade-up">{eyebrow}</p> : null}
          {title ? <h2 className="display-h2 tb-fade-up tb-d1" style={{ marginTop: 18 }}>{title}</h2> : null}
          <div className="tb-stats__grid">
            {stats.map((s, i) => (
              <div key={s.label} className={`tb-stat tb-fade-up tb-d${Math.min(i + 1, 5)}`}>
                {"word" in s ? (
                  <p className="tb-stat__num tb-stat__num--word">{s.word}</p>
                ) : (
                  <p className="tb-stat__num">
                    <CountUp value={s.value} from={s.from} prefix={s.prefix} suffix={s.suffix} />
                  </p>
                )}
                <p className="tb-stat__label">{s.label}</p>
                {s.text ? <p className="tb-stat__text">{s.text}</p> : null}
              </div>
            ))}
          </div>
          {link ? (
            <div className="tb-links tb-fade-up" style={{ marginTop: 36 }}>
              <Link href={link.href} className="tb-link">
                {link.label}
              </Link>
            </div>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}

const SHAPES = ["a", "b", "a", "b", "c", "b"] as const;

/** The strip of photographs that never stops moving. */
export function PhotoTicker({
  items,
  label,
  seconds = 90,
  band,
}: {
  items: (Img & { href?: string; caption?: string })[];
  label: string;
  seconds?: number;
  band?: "light" | "dark";
}) {
  const filled = items.filter((it) => it.src);
  // A strip of two photographs is a gap, not a strip.
  if (filled.length < 3) return null;
  const row = (copy: 0 | 1) =>
    filled
      .map((it, i) => {
        const hidden = copy === 1;
        const cls = `tb-ticker__item tb-ticker__item--${SHAPES[i % SHAPES.length]}${it.caption ? " has-cap" : ""}`;
        const inner = (
          <>
            <img src={it.src} alt={hidden ? "" : it.alt} loading="lazy" decoding="async" />
            {it.caption ? <span className="tb-ticker__cap">{it.caption}</span> : null}
          </>
        );
        return it.href ? (
          <Link
            key={`${copy}-${i}`}
            href={it.href}
            className={cls}
            aria-hidden={hidden || undefined}
            tabIndex={hidden ? -1 : undefined}
          >
            {inner}
          </Link>
        ) : (
          <figure key={`${copy}-${i}`} className={cls} aria-hidden={hidden || undefined}>
            {inner}
          </figure>
        );
      });
  return (
    <section className={`tb-ticker${band ? ` tb-band tb-band--${band}` : ""}`} aria-label={label}>
      <div className="tb-ticker__track" style={{ ["--tb-ticker-dur" as string]: `${seconds}s` }}>
        {row(0)}
        {row(1)}
      </div>
    </section>
  );
}

/** Photograph (or looping video) on one half, a titled block on the other. */
export function SplitFeature({
  id,
  media,
  eyebrow,
  heading,
  children,
  link,
  reverse = false,
  alt = false,
  band,
}: {
  id?: string;
  media: Img & { video?: string; poster?: string };
  eyebrow?: ReactNode;
  heading: ReactNode;
  children?: ReactNode;
  link?: LinkT;
  reverse?: boolean;
  alt?: boolean;
  band?: "light" | "dark";
}) {
  return (
    <section id={id} className={`tb-section${alt ? " tb-alt" : ""}${band ? ` tb-band tb-band--${band}` : ""}`}>
      <Reveal className={`tb-split${reverse ? " tb-split--reverse" : ""}`}>
        <div className="tb-split__media tb-frame tb-zoom">
          {media.video ? (
            <AutoVideo src={media.video} poster={media.poster} label={media.alt} />
          ) : (
            <img src={media.src} alt={media.alt} loading="lazy" decoding="async" />
          )}
        </div>
        <div className="tb-split__text">
          {eyebrow ? <p className="tb-eyebrow tb-fade-up">{eyebrow}</p> : null}
          <h2 className="tb-split__heading tb-fade-up tb-d1">{heading}</h2>
          {children ? <div className="tb-fade-up tb-d2">{children}</div> : null}
          {link ? (
            <div className="tb-fade-up tb-d3" style={{ marginTop: 26 }}>
              <Link href={link.href} className="tb-link">
                {link.label}
              </Link>
            </div>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}

/** A sentence set as a quotation beside an offset photograph. */
export function QuoteFeature({
  quote,
  cite,
  media,
  alt = false,
}: {
  quote: ReactNode;
  cite: ReactNode;
  media: Img;
  alt?: boolean;
}) {
  return (
    <section className={`tb-section${alt ? " tb-alt" : ""}`}>
      <Reveal className="tb-quote">
        <div className="tb-quote__text">
          <blockquote className="tb-fade-up">&ldquo;{quote}&rdquo;</blockquote>
          <p className="tb-quote__cite tb-fade-up tb-d1">{cite}</p>
        </div>
        <div className="tb-quote__media tb-frame tb-zoom">
          <img src={media.src} alt={media.alt} loading="lazy" decoding="async" />
        </div>
      </Reveal>
    </section>
  );
}

/** One photograph, framed wide or inset, settling in from a slight zoom. */
export function PhotoFrame({
  img,
  variant = "wide",
}: {
  img: Img;
  variant?: "wide" | "inset";
}) {
  if (!img.src) return null;
  return (
    <Reveal className={`tb-frame tb-frame--${variant} tb-fade`}>
      <img src={img.src} alt={img.alt} loading="lazy" decoding="async" />
    </Reveal>
  );
}

/** Full-width looping video band. */
export function VideoBand({
  src,
  poster,
  label,
}: {
  src: string;
  poster?: string;
  label: string;
}) {
  return (
    <Reveal className="tb-video tb-frame tb-fade">
      <AutoVideo src={src} poster={poster} label={label} />
    </Reveal>
  );
}

/** Portrait photo card with a small label, a serif title and a line of text. */
export function ImageCard({
  href,
  img,
  eyebrow,
  title,
  text,
  className = "",
}: {
  href: string;
  img: Img;
  eyebrow?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`tb-card ${className}`}>
      <span className="tb-card__img">
        {img.src ? <img src={img.src} alt={img.alt} loading="lazy" decoding="async" /> : null}
      </span>
      <span className="tb-card__meta">
        {eyebrow ? <span className="tb-card__eyebrow">{eyebrow}</span> : null}
        <span className="tb-card__title title-case">{title}</span>
        {text ? <span className="tb-card__text">{text}</span> : null}
      </span>
    </Link>
  );
}

/**
 * A framework's steps as photo pillars: photograph, number, linked title, one
 * paragraph. Each title deep links into the step on its process page.
 */
export function Pillars({
  items,
}: {
  items: { title: string; body: string; href: string; img: Img }[];
}) {
  return (
    <ol className="tb-pillars">
      {items.map((it, i) => (
        <li key={it.title} className={`tb-pillar tb-fade-up tb-d${Math.min(i + 1, 5)}`}>
          <Link href={it.href} className="tb-pillar__img tb-frame" tabIndex={-1} aria-hidden>
            {it.img.src ? <img src={it.img.src} alt="" loading="lazy" decoding="async" /> : null}
          </Link>
          <span className="tb-pillar__num" aria-hidden>
            {String(i + 1).padStart(2, "0")}
          </span>
          <h3>
            <Link href={it.href}>{it.title}</Link>
          </h3>
          <p>{it.body}</p>
        </li>
      ))}
    </ol>
  );
}

/** The closing band: a title, an italic line, and the contact form. */
export function InquireSection({
  id = "inquire",
  title = "Start a Conversation",
  sub = "Tell us a little about your move, and we will be in touch.",
  tone,
}: {
  id?: string;
  title?: ReactNode;
  sub?: ReactNode;
  /** Set on inner pages so the form lands on the opposite band to the last. */
  tone?: "light" | "dark";
}) {
  return (
    <section id={id} className={`tb-section tb-inquire${tone ? ` tb-band tb-band--${tone}` : ""}`}>
      <Reveal className="tb-boxed">
        <h2 className="tb-inquire__title tb-fade-up">{title}</h2>
        <p className="tb-inquire__sub tb-fade-up tb-d1">{sub}</p>
        <div className="tb-form tb-fade-up tb-d2">
          <ContactForm />
        </div>
      </Reveal>
    </section>
  );
}
