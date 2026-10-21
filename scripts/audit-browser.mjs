#!/usr/bin/env node
/**
 * THE CHECKS THAT NEED A REAL BROWSER.
 *
 * `npm run audit:browser` — against a running site.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS, AND IT IS THE MOST IMPORTANT NOTE IN THE FILE
 *
 * `npm run gate` reads HTML. Everything it knows, it knows from markup. That is
 * enough for a great deal — a missing h1, a thin page, a broken link, an FAQ in
 * the schema that the page never asks — and it is structurally blind to
 * anything that only exists once a browser has applied CSS and laid the page
 * out.
 *
 * Two of the worst defects found in this seed were invisible to it, and both
 * were found by a human looking at a screenshot:
 *
 *   1. In dark mode, alternating section headings rendered at a contrast ratio
 *      of **1.02:1** against the page — effectively invisible — and body copy
 *      at 2.20:1. Eleven to seventeen elements per page below the minimum. The
 *      markup was perfect. A CSS token resolved to an empty value and the band
 *      painted no background while still switching the text colour.
 *
 *   2. On every desktop inner page the breadcrumb trail rendered **on top of
 *      the logo**. The header is `position: absolute` above 900px, so it is out
 *      of normal flow, and the offset that cleared it had been removed. Two
 *      elements, both correct in the HTML, occupying the same pixels.
 *
 * No amount of reading HTML finds either. So this opens a browser, at two
 * widths and in both colour schemes, and measures.
 * ---------------------------------------------------------------------------
 *
 * WHAT IT CHECKS
 *
 *   axe-core        WCAG 2.0/2.1 A and AA, plus best-practice rules
 *   contrast        every text node against its painted backdrop, both schemes
 *   overlap         elements covering other elements' text
 *   focus           every focusable thing has a visible focus indicator
 *   targets         tap targets at phone width
 *   overflow        horizontal scroll
 *
 * DEPENDENCIES, AND THE DELIBERATE CHOICE IN THEM
 *
 * `puppeteer-core` rather than `puppeteer`: the full package downloads its own
 * copy of Chromium, roughly 150 MB, on every `npm install` of every site built
 * from this seed. The `-core` package downloads nothing and drives a browser
 * that is already on the machine. Almost every machine has Chrome; the ones
 * that do not get a clear message rather than a stack trace.
 *
 * This is NOT part of `npm run gate` by default for the same reason: the gate
 * is run by people who sell heating systems, on their own laptops, and it must
 * not fail because Chrome lives somewhere unusual. The gate runs it when it can
 * and says so when it cannot. CI runs it always, where Chrome is guaranteed.
 */

import { existsSync } from "node:fs";
import { platform } from "node:os";

/*
 * THE BASE URL, from the environment or from the command line.
 *
 * The two seeds call their checks differently — this one is handed
 * `CHECK_BASE` in the environment by the service seed's gate and a bare URL as
 * the last argument by the realtor seed's. Accepting both means one script
 * works in both without either gate having to change how it calls things.
 */
const argUrl = process.argv.slice(2).find((a) => /^https?:\/\//.test(a));
const BASE = process.env.CHECK_BASE || argUrl || "http://localhost:3000";
const ONLY = process.env.AUDIT_ONLY ? process.env.AUDIT_ONLY.split(",") : null;

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
};

let failures = 0;
let warnings = 0;
const fail = (m) => {
  console.log(`  ${c.red("✗")} ${m}`);
  failures++;
};
const warn = (m) => {
  console.log(`  ${c.yellow("⚠")} ${m}`);
  warnings++;
};
const pass = (m) => console.log(`  ${c.green("✓")} ${m}`);
const note = (m) => console.log(`  ${c.dim("·")} ${m}`);
const layer = (n) => console.log(`\n── ${n}`);

/* ------------------------------------------------------------------ Chrome */

/**
 * Where Chrome lives.
 *
 * `CHROME_PATH` first, because that is what CI sets and what somebody with an
 * unusual install can set. Then the ordinary places, per platform.
 */
function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = {
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      `${process.env.HOME}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
    ],
    linux: [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/opt/google/chrome/chrome",
    ],
    win32: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ],
  }[platform()] ?? [];
  return candidates.find((p) => existsSync(p)) ?? null;
}

/* --------------------------------------------------------- the page sample */

/**
 * Which pages to open.
 *
 * Not all of them: a browser audit of sixty URLs at four combinations takes
 * minutes, and the defects this finds are almost always in shared layout rather
 * than on one page. One of each PAGE TYPE is what is needed — the home page
 * (which has a layout of its own), one page from each top-level section, one
 * page from inside each section, and the contact page because it carries the
 * form. What those sections are called differs between seeds, which is exactly
 * why they are read from the sitemap rather than named here.
 */
async function samplePages() {
  /*
   * DISCOVERED FROM THE SITEMAP, NOT FROM A LIST OF ROUTE NAMES.
   *
   * The first version named the routes it wanted — /services, /team, /areas.
   * That is this seed's vocabulary. The realtor seed, built from the same
   * engine, has /listings, /buyers, /sellers and /process, so a hard-coded list
   * would silently audit three pages there and report a clean pass.
   *
   * The sitemap is the one thing both seeds generate from their own route
   * helpers, so it is the right source. One page per PATH SHAPE is enough: the
   * defects this finds live in shared layout, and auditing sixty URLs at four
   * combinations takes minutes for no extra information.
   */
  const out = ["/"];
  let paths = [];
  try {
    const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
    paths = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)]
      .map((m) => m[1].replace(/^https?:\/\/[^/]+/, "") || "/")
      .filter(Boolean);
  } catch {
    /* a missing sitemap is a different layer's problem */
  }

  // One of each top-level section, and one of each section's children.
  const seenTop = new Set(["/"]);
  const seenPrefix = new Set();
  for (const p of paths) {
    const segs = p.split("/").filter(Boolean);
    if (segs.length === 0) continue;
    if (segs.length === 1) {
      if (!seenTop.has(`/${segs[0]}`)) {
        seenTop.add(`/${segs[0]}`);
        out.push(p);
      }
    } else {
      const prefix = `/${segs[0]}/`;
      if (!seenPrefix.has(prefix)) {
        seenPrefix.add(prefix);
        out.push(p);
      }
    }
  }

  /*
   * The contact page earns a place even when the sitemap omits it, because it
   * carries the form — the one piece of interactive markup on the whole site,
   * and where the missing-label and missing-focus-ring defects both lived.
   */
  if (!out.includes("/contact")) out.push("/contact");

  // Keep it to a sensible number, and only pages that actually respond.
  const live = [];
  for (const p of out.slice(0, 14)) {
    try {
      const r = await fetch(`${BASE}${p}`, { redirect: "follow" });
      if (r.status === 200) live.push(p);
    } catch {
      /* ignore */
    }
  }
  return [...new Set(live)];
}

/* ------------------------------------------------------------- the checks */

const VIEWPORTS = [
  { label: "phone", width: 390, height: 844 },
  { label: "desktop", width: 1440, height: 900 },
];
const SCHEMES = ["light", "dark"];

/**
 * Relative luminance and contrast, per WCAG. Both take plain [r,g,b] 0-255.
 *
 * COLOURS ARE RESOLVED IN THE BROWSER, NOT PARSED HERE, and that is the result
 * of getting it wrong. The first version of this check read colour strings with
 * a regex, and modern CSS does not cooperate: a background of
 * `color(srgb 0.859 0.853 0.817)` had its LAST number read as an alpha of
 * 0.817, which the code then treated as semi-transparent, discarded, and walked
 * past to find the page background instead.
 *
 * The effect was twenty-five confident failures reporting 1.02:1 on text that
 * was in fact dark-on-cream and perfectly readable. A check that cries wolf is
 * worse than no check, because the next real finding gets ignored with the rest.
 *
 * So every colour now goes through a 1x1 canvas inside the page: fill with the
 * computed value, read the pixel back, get true [r,g,b,a] for any syntax the
 * browser itself understands — rgb, rgba, hsl, color(), oklch, named, whatever
 * arrives next.
 */
const lin = (x) => {
  const s = x / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)];
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
};

export async function run() {
  console.log(c.bold(`\nBrowser audit — ${BASE}\n`) + "─".repeat(48));

  const chrome = findChrome();
  if (!chrome) {
    console.log(
      `\n  ${c.yellow("⚠")} No Chrome found, so the browser checks did not run.\n` +
        `\n    This is the half of the checklist that needs a real browser — contrast,\n` +
        `    overlapping elements, focus rings and tap targets. The rest of\n` +
        `    \`npm run gate\` reads HTML and cannot see any of it.\n` +
        `\n    Install Google Chrome, or set CHROME_PATH to an existing browser.\n`,
    );
    return { failures: 0, warnings: 1, skipped: true };
  }
  note(`browser: ${chrome}`);

  let puppeteer, AxePuppeteer;
  try {
    puppeteer = (await import("puppeteer-core")).default;
    AxePuppeteer = (await import("@axe-core/puppeteer")).AxePuppeteer;
  } catch {
    console.log(
      `\n  ${c.yellow("⚠")} The browser audit's packages are not installed, so it did not run.\n` +
        `\n    Run: npm install\n` +
        `    (puppeteer-core and @axe-core/puppeteer are devDependencies of this seed.\n` +
        `     They download no browser of their own — about 5 MB, not 150.)\n`,
    );
    return { failures: 0, warnings: 1, skipped: true };
  }

  try {
    const r = await fetch(BASE, { redirect: "follow" });
    if (r.status !== 200) throw new Error(String(r.status));
  } catch {
    fail(
      `nothing is running at ${BASE}. Start the site first (\`npm run dev\`) or ` +
        `use \`npm run gate\`, which starts one itself.`,
    );
    return { failures, warnings };
  }

  const paths = await samplePages();
  note(`${paths.length} page type(s): ${paths.join(", ")}`);

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    if (!ONLY || ONLY.includes("axe")) await checkAxe(browser, AxePuppeteer, paths);
    if (!ONLY || ONLY.includes("contrast")) await checkContrast(browser, paths);
    if (!ONLY || ONLY.includes("overlap")) await checkOverlap(browser, paths);
    if (!ONLY || ONLY.includes("focus")) await checkFocus(browser, paths);
    if (!ONLY || ONLY.includes("targets")) await checkTargets(browser, paths);
  } finally {
    await browser.close();
  }

  console.log("\n" + "─".repeat(48));
  if (failures) {
    console.log(`${c.red(`${failures} failure(s)`)}, ${warnings} warning(s).`);
  } else {
    console.log(`${c.green("No failures")}, ${warnings} warning(s).`);
  }
  return { failures, warnings };
}

/** Open one page, settled, at a given size and scheme. */
async function open(browser, path, { width, height }, scheme) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 1200));
  /*
   * REVEAL ANIMATIONS ARE FORCED TO COMPLETION.
   *
   * This design fades sections in on scroll. Below the fold they sit at
   * `opacity: 0`, and a contrast or overlap check run against them measures a
   * transparent element and reports nonsense — or worse, reports nothing and
   * passes. Twice during development a "finding" turned out to be an unplayed
   * animation. So every reveal is completed before anything is measured.
   */
  await page.evaluate(() => {
    document
      .querySelectorAll('.reveal-ready,[class*="tb-fade"],[class*="tb-d"],[class*="reveal"]')
      .forEach((el) => {
        el.classList.add("in-view");
        el.style.opacity = "1";
        el.style.transform = "none";
      });
  });
  await new Promise((r) => setTimeout(r, 250));
  return page;
}

/* --------------------------------------------------------------- axe-core */

async function checkAxe(browser, AxePuppeteer, paths) {
  layer("axe-core: WCAG 2.1 A and AA, and best practice");
  const found = new Map();
  let checked = 0;

  for (const vp of VIEWPORTS) {
    for (const scheme of SCHEMES) {
      for (const path of paths) {
        let page;
        try {
          page = await open(browser, path, vp, scheme);
          const res = await new AxePuppeteer(page)
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
            .analyze();
          checked++;
          for (const v of res.violations) {
            if (!found.has(v.id)) {
              found.set(v.id, { ...v, where: new Set(), examples: [] });
            }
            const e = found.get(v.id);
            e.where.add(`${vp.label}/${scheme}${path}`);
            for (const n of v.nodes.slice(0, 2)) {
              const snip = n.html.replace(/\s+/g, " ").slice(0, 110);
              if (e.examples.length < 3 && !e.examples.includes(snip)) e.examples.push(snip);
            }
          }
        } catch (err) {
          warn(`${vp.label}/${scheme}${path} — could not be analysed: ${err.message}`);
        } finally {
          if (page) await page.close();
        }
      }
    }
  }

  /*
   * A SCAN THAT EXAMINED NOTHING IS NOT A PASS. The same guard as everywhere
   * else in this repository, for the same reason: it has gone wrong three times.
   */
  if (checked === 0) {
    fail("the accessibility scan examined no pages. It is broken, not passing.");
    return;
  }

  const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  const list = [...found.values()].sort(
    (a, b) => (order[a.impact] ?? 9) - (order[b.impact] ?? 9),
  );

  for (const v of list) {
    const msg =
      `[${(v.impact || "?").toUpperCase()}] ${v.id} — ${v.help}. ` +
      `${v.where.size} page/size/scheme combination(s), e.g. ${[...v.where].slice(0, 3).join(", ")}`;
    // critical and serious are failures; the rest are worth seeing, not blocking
    if (v.impact === "critical" || v.impact === "serious") fail(msg);
    else warn(msg);
    for (const ex of v.examples) console.log(c.dim(`        ${ex}`));
  }
  if (!list.length) pass(`${checked} page/size/scheme combination(s), no violations`);
}

/* --------------------------------------------------------------- contrast */

async function checkContrast(browser, paths) {
  layer("contrast: text against what is actually painted behind it");
  let checked = 0;
  let bad = 0;

  for (const scheme of SCHEMES) {
    for (const path of paths) {
      let page;
      try {
        page = await open(browser, path, VIEWPORTS[1], scheme);
        const rows = await page.evaluate(() => {
          /* True [r,g,b,a] for any CSS colour, via a one-pixel canvas. */
          const cvs = document.createElement("canvas");
          cvs.width = cvs.height = 1;
          const ctx = cvs.getContext("2d", { willReadFrequently: true });
          const resolve = (css) => {
            if (!css) return null;
            ctx.clearRect(0, 0, 1, 1);
            try {
              ctx.fillStyle = css;
            } catch {
              return null;
            }
            ctx.fillRect(0, 0, 1, 1);
            const d = ctx.getImageData(0, 0, 1, 1).data;
            return [d[0], d[1], d[2], d[3] / 255];
          };
          /* Lay a semi-transparent colour over an opaque one. */
          const over = (fg, bg) => [
            Math.round(fg[0] * fg[3] + bg[0] * (1 - fg[3])),
            Math.round(fg[1] * fg[3] + bg[1] * (1 - fg[3])),
            Math.round(fg[2] * fg[3] + bg[2] * (1 - fg[3])),
            1,
          ];

          const out = [];
          const SEL = "h1,h2,h3,h4,p,li,a,button,span,label,blockquote,figcaption,td,th";
          for (const el of document.querySelectorAll(SEL)) {
            const r = el.getBoundingClientRect();
            if (r.width < 6 || r.height < 6) continue;
            const own = [...el.childNodes]
              .filter((n) => n.nodeType === 3)
              .map((n) => n.textContent.trim())
              .join("");
            if (!own) continue;
            const cs = getComputedStyle(el);
            if (cs.visibility === "hidden" || cs.display === "none") continue;
            if (Number.parseFloat(cs.opacity) < 0.6) continue;
            /*
             * DECORATION IS A WARNING, NOT A FAILURE.
             *
             * WCAG 1.4.3 exempts "incidental" text, and text the author has
             * explicitly hidden from assistive technology is the clearest case
             * of that. The realtor seed sets big ordinals — 01, 02, 03 — in the
             * brand gold with `aria-hidden="true"`: a deliberate design mark,
             * carrying no information a screen reader needs.
             *
             * Reporting those as failures is the cries-wolf problem. Nine
             * identical lines about decorative numerals is how the one real
             * finding underneath them gets scrolled past. They are still worth
             * SEEING, because a designer may not have intended them to be that
             * faint, so they come out as warnings.
             *
             * Three other checks in this file already skip aria-hidden; this
             * one did not, which was an inconsistency rather than a decision.
             */
            const decorative = Boolean(el.closest('[aria-hidden="true"]'));

            /*
             * A PHOTOGRAPH IS NOT A COLOUR, so text over one is skipped —
             * walking up to a painted colour finds the page behind the image,
             * which reported white nav links over a dark hero at 1.02:1
             * against the white page. Those need a scrim calculation or a human.
             */
            let n = el;
            let overImage = false;
            const stack = [];
            while (n && n !== document.documentElement) {
              const s2 = getComputedStyle(n);
              if (s2.backgroundImage && s2.backgroundImage !== "none") overImage = true;
              const col = resolve(s2.backgroundColor);
              if (col && col[3] > 0.01) {
                stack.push(col);
                if (col[3] >= 0.99) break; // opaque: nothing behind it shows
              }
              n = n.parentElement;
            }
            if (overImage) continue;
            if (!stack.length || stack[stack.length - 1][3] < 0.99) continue;

            // composite from the opaque layer forward
            let bg = stack.pop();
            while (stack.length) bg = over(stack.pop(), bg);

            // an image or video painted between the text and that background
            const mid = document.elementsFromPoint(
              Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 2),
              Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 2),
            );
            if (mid.some((e) => /^(IMG|VIDEO|CANVAS|SVG)$/i.test(e.tagName))) continue;

            let fg = resolve(cs.color);
            if (!fg) continue;
            if (fg[3] < 0.99) fg = over(fg, bg);

            const fs = Number.parseFloat(cs.fontSize);
            const weight = Number.parseInt(cs.fontWeight, 10) || 400;
            const large = fs >= 24 || (fs >= 18.66 && weight >= 700);
            out.push({
              tag: el.tagName.toLowerCase(),
              text: own.replace(/\s+/g, " ").slice(0, 44),
              fg,
              bg,
              need: large ? 3 : 4.5,
              decorative,
            });
          }
          return out;
        });

        const hex = ([r, g, b]) =>
          "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
        for (const row of rows) {
          checked++;
          const got = ratio(row.fg, row.bg);
          if (got < row.need) {
            const msg =
              `${scheme} ${path} — <${row.tag}> "${row.text}" is ${got.toFixed(2)}:1 ` +
              `against its background, needs ${row.need}:1 ` +
              `(${hex(row.fg)} on ${hex(row.bg)})`;
            if (row.decorative) {
              warn(`${msg} — decorative (aria-hidden), so exempt, but worth a look`);
            } else {
              fail(msg);
              bad++;
            }
          }
        }
      } catch (err) {
        warn(`${scheme} ${path} — contrast could not be measured: ${err.message}`);
      } finally {
        if (page) await page.close();
      }
    }
  }

  if (checked === 0) {
    fail("the contrast check measured no text. It is broken, not passing.");
    return;
  }
  if (!bad) pass(`${checked} text element(s) across both colour schemes clear their minimum`);
}

/* ---------------------------------------------------------------- overlap */

async function checkOverlap(browser, paths) {
  layer("overlap: nothing is printed on top of anything else");
  let checked = 0;
  let bad = 0;

  for (const vp of VIEWPORTS) {
    for (const path of paths) {
      let page;
      try {
        page = await open(browser, path, vp, "light");
        const hits = await page.evaluate(() => {
          /*
           * WHAT THIS IS LOOKING FOR, precisely.
           *
           * Two elements that each carry their own text, whose painted boxes
           * intersect meaningfully, and which are not ancestors of one another.
           *
           * The real case it caught: a breadcrumb trail and a site logo
           * occupying the same pixels on every desktop inner page, because the
           * header is `position: absolute` above 900px and the offset clearing
           * it had been removed. Both elements were correct in the markup.
           *
           * TWO REFINEMENTS, BOTH FROM FALSE POSITIVES IT PRODUCED FIRST:
           *
           * 1. `getClientRects()` rather than `getBoundingClientRect()`. An
           *    inline link that wraps across two lines has a bounding box
           *    spanning both, which overlaps the bounding box of every other
           *    inline link in the paragraph. Reported as "100% overlap" on
           *    perfectly ordinary prose. The per-line boxes are what is
           *    actually painted.
           *
           * 2. Pairs sharing their nearest BLOCK ancestor are skipped. Two
           *    links in one sentence are laid out together by design; the logo
           *    and the breadcrumb are in different block containers, which is
           *    what makes their collision a bug rather than a line of text.
           */
          const blockOf = (el) => {
            let n = el.parentElement;
            while (n && n !== document.documentElement) {
              const d = getComputedStyle(n).display;
              if (d !== "inline" && d !== "contents") return n;
              n = n.parentElement;
            }
            return document.body;
          };
          const visible = (el) => {
            let n = el;
            while (n && n !== document.documentElement) {
              const s2 = getComputedStyle(n);
              if (s2.visibility === "hidden" || s2.display === "none") return false;
              if (Number.parseFloat(s2.opacity) < 0.15) return false;
              n = n.parentElement;
            }
            return true;
          };

          const texty = [];
          for (const el of document.querySelectorAll("a,h1,h2,h3,p,li,span,button,label")) {
            const own = [...el.childNodes]
              .filter((n) => n.nodeType === 3)
              .map((n) => n.textContent.trim())
              .join("");
            if (!own) continue;
            if (el.closest('[aria-hidden="true"]')) continue;
            if (!visible(el)) continue;
            const rects = [...el.getClientRects()].filter((r) => r.width > 8 && r.height > 8);
            if (!rects.length) continue;
            texty.push({ el, rects, block: blockOf(el), text: own.replace(/\s+/g, " ").slice(0, 40) });
          }

          const out = [];
          for (let i = 0; i < texty.length; i++) {
            for (let j = i + 1; j < texty.length; j++) {
              const a = texty[i];
              const b = texty[j];
              if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
              if (a.block === b.block) continue; // laid out together on purpose
              let worst = 0;
              for (const ra of a.rects) {
                for (const rb of b.rects) {
                  const x = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
                  const y = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
                  if (x <= 2 || y <= 2) continue;
                  const smaller = Math.min(ra.width * ra.height, rb.width * rb.height);
                  worst = Math.max(worst, (x * y) / smaller);
                }
              }
              if (worst < 0.33) continue;
              out.push({
                a: `<${a.el.tagName.toLowerCase()}> "${a.text}"`,
                b: `<${b.el.tagName.toLowerCase()}> "${b.text}"`,
                pct: Math.round(worst * 100),
              });
              if (out.length >= 4) return out;
            }
          }
          return out;
        });
        checked++;
        for (const h of hits) {
          fail(`${vp.label} ${path} — ${h.a} and ${h.b} overlap by ${h.pct}% of the smaller one`);
          bad++;
        }
      } catch (err) {
        warn(`${vp.label} ${path} — overlap could not be measured: ${err.message}`);
      } finally {
        if (page) await page.close();
      }
    }
  }
  if (checked === 0) {
    fail("the overlap check examined no pages. It is broken, not passing.");
    return;
  }
  if (!bad) pass(`${checked} page/size combination(s) with nothing printed over anything else`);
}

/* ------------------------------------------------------------------ focus */

async function checkFocus(browser, paths) {
  layer("focus: a keyboard user can see where they are");
  let bad = 0;
  let checked = 0;

  for (const path of paths) {
    let page;
    try {
      page = await open(browser, path, VIEWPORTS[1], "light");
      const res = await page.evaluate(() => {
        /*
         * Measured by FOCUSING each control and comparing the computed style
         * before and after, rather than by reading the stylesheet. A rule can
         * exist and be overridden; what matters is whether anything changes
         * visibly when the element has focus.
         *
         * The real case: the focus selector covered `a`, `button` and
         * `[tabindex]` — which is everything EXCEPT native form controls, since
         * an <input> needs no tabindex to be focusable. Every field on the
         * contact form was focusable with no visible indicator.
         */
        const out = { noRing: [], total: 0, skipLink: false };
        const first = document.querySelector("a[href],button");
        if (first && /skip/i.test(first.textContent || "")) out.skipLink = true;
        /*
         * ONLY THINGS A KEYBOARD USER CAN ACTUALLY SEE.
         *
         * The first version reported twenty missing focus rings, every one of
         * them a link inside the CLOSED navigation dropdown. A hidden element
         * shows no visible change when focused because nothing about it is
         * visible, so the check was measuring its own blind spot and calling it
         * a defect — on five pages at once, which is how a real finding gets
         * lost in the noise.
         */
        const seeable = (el) => {
          let n = el;
          while (n && n !== document.documentElement) {
            const s2 = getComputedStyle(n);
            if (s2.visibility === "hidden" || s2.display === "none") return false;
            if (Number.parseFloat(s2.opacity) < 0.15) return false;
            n = n.parentElement;
          }
          return true;
        };
        const items = [
          ...document.querySelectorAll(
            'a[href],button,input:not([type="hidden"]),select,textarea,[tabindex]:not([tabindex="-1"])',
          ),
        ];
        for (const el of items.slice(0, 60)) {
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) continue;
          if (el.closest('[aria-hidden="true"]')) continue;
          if (!seeable(el)) continue;
          /* A disabled control cannot take focus, so it cannot show one. The
             carousel's back button starts disabled and was reported as missing
             a focus ring on every run. */
          if (el.disabled || el.getAttribute("aria-disabled") === "true") continue;
          out.total++;
          const before = getComputedStyle(el);
          const snapshot = [before.outlineStyle, before.outlineWidth, before.outlineColor,
            before.boxShadow, before.borderColor, before.backgroundColor, before.textDecorationLine].join("|");
          el.focus({ preventScroll: true });
          const after = getComputedStyle(el);
          const now = [after.outlineStyle, after.outlineWidth, after.outlineColor,
            after.boxShadow, after.borderColor, after.backgroundColor, after.textDecorationLine].join("|");
          const visible =
            now !== snapshot &&
            !(after.outlineStyle === "none" && after.boxShadow === "none" && now === snapshot);
          if (!visible) {
            out.noRing.push(
              `<${el.tagName.toLowerCase()}${el.getAttribute("name") ? ` name="${el.getAttribute("name")}"` : ""}> ` +
                `"${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 26)}"`,
            );
          }
          el.blur();
        }
        return out;
      });
      checked++;
      for (const n of res.noRing.slice(0, 4)) {
        fail(`${path} — no visible focus indicator on ${n}. WCAG 2.4.7.`);
        bad++;
      }
      if (!res.skipLink) {
        warn(
          `${path} — the first focusable thing is not a "skip to content" link. ` +
            `A keyboard user tabs through the whole menu before reaching the page.`,
        );
      }
    } catch (err) {
      warn(`${path} — focus could not be measured: ${err.message}`);
    } finally {
      if (page) await page.close();
    }
  }
  if (checked === 0) {
    fail("the focus check examined no pages. It is broken, not passing.");
    return;
  }
  if (!bad) pass(`${checked} page(s) where every control shows focus`);
}

/* ---------------------------------------------------------------- targets */

async function checkTargets(browser, paths) {
  layer("tap targets and horizontal scroll, at phone width");
  let bad = 0;
  let checked = 0;

  for (const path of paths) {
    let page;
    try {
      page = await open(browser, path, VIEWPORTS[0], "light");
      const res = await page.evaluate(() => {
        const doc = document.documentElement;
        const small = [];
        for (const el of document.querySelectorAll(
          'a[href],button,input:not([type="hidden"]),select,[role="button"]',
        )) {
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          if (el.closest('[aria-hidden="true"]')) continue;
          /*
           * INLINE LINKS INSIDE A SENTENCE ARE EXEMPT, and that exemption is in
           * WCAG 2.5.8 itself. Widening them would wreck the line height of
           * every paragraph on the site, and a gate that demands that is a gate
           * people switch off. A link whose parent is a <p> or an <li> carrying
           * other text is in a sentence.
           */
          /*
           * INLINE LINKS INSIDE A SENTENCE ARE EXEMPT — WCAG 2.5.8 says so, and
           * widening them would wreck the line height of every paragraph.
           *
           * The sentence is found by walking to the nearest BLOCK ancestor, not
           * by looking at parentElement. A link wrapped in its own <span> has a
           * parent whose text is exactly the link's text, so the first version
           * thought it stood alone and flagged ten links in one sentence on the
           * team page.
           */
          let blk = el.parentElement;
          while (blk && blk !== document.documentElement) {
            const d = getComputedStyle(blk).display;
            if (d !== "inline" && d !== "contents") break;
            blk = blk.parentElement;
          }
          const inSentence =
            blk &&
            /^(P|LI|TD|BLOCKQUOTE|FIGCAPTION|H1|H2|H3|H4|DIV)$/.test(blk.tagName) &&
            (blk.textContent || "").trim().length > (el.textContent || "").trim().length + 12;
          if (inSentence) continue;
          /*
           * A CHECKBOX WRAPPED IN ITS LABEL IS AS BIG AS THE LABEL.
           * The consent checkbox measured 24x24 and was reported five times,
           * but clicking anywhere in the sentence beside it toggles it — the
           * label IS the target, and it is far larger than 44px. Measure that.
           */
          const label = el.closest("label");
          const box =
            label && (label.textContent || "").trim().length > 2
              ? label.getBoundingClientRect()
              : r;
          if (box.height < 44 || box.width < 24) {
            small.push({
              tag: el.tagName.toLowerCase(),
              text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 26),
              w: Math.round(box.width),
              h: Math.round(box.height),
            });
          }
        }
        let widest = null;
        const over = doc.scrollWidth - doc.clientWidth;
        if (over > 1) {
          for (const el of document.querySelectorAll("*")) {
            const r = el.getBoundingClientRect();
            if (r.right > doc.clientWidth + 1 && (!widest || r.right > widest.right)) {
              widest = {
                right: Math.round(r.right),
                tag: el.tagName.toLowerCase(),
                cls: (el.className || "").toString().slice(0, 40),
              };
            }
          }
        }
        return { over, small: small.slice(0, 5), count: small.length, widest };
      });
      checked++;
      if (res.over > 1) {
        fail(
          `${path} — the page scrolls sideways by ${res.over}px at 390px wide` +
            (res.widest ? `, widest is <${res.widest.tag} class="${res.widest.cls}">` : ""),
        );
        bad++;
      }
      if (res.count) {
        warn(
          `${path} — ${res.count} tap target(s) under 44px: ` +
            res.small.map((s) => `${s.tag} "${s.text}" ${s.w}×${s.h}`).join(", "),
        );
      }
    } catch (err) {
      warn(`${path} — tap targets could not be measured: ${err.message}`);
    } finally {
      if (page) await page.close();
    }
  }
  if (checked === 0) {
    fail("the tap target check examined no pages. It is broken, not passing.");
    return;
  }
  if (!bad) pass(`${checked} page(s) with no horizontal scroll at phone width`);
}

/* ------------------------------------------------------------------- main */

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const { failures: f, skipped } = await run();
  if (skipped) process.exit(0);
  process.exit(f ? 1 : 0);
}
