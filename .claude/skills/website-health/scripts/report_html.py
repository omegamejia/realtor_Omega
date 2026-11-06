"""
The visual report: one self-contained HTML file, readable by anyone, no internet needed.

    render(reports) -> str      reports: one grader.audit() dict, or several to compare

Everything that came from the audited website (titles, phrases, page paths, the
phone screenshot) is untrusted: it is escaped, and the screenshot is only used when
it is a data:image URL. A hostile page must not be able to put script into a report
someone opens on their own computer.
"""
from __future__ import annotations

import html
from datetime import datetime
import json
import os
from urllib.parse import urlparse

import security

VERSION = "1.4.0"

LABEL = {"pass": "Pass", "fail": "Fix", "warn": "Warning", "todo": "Fill in", "local": "After launch", "notMeasured": "Not measured"}
ICON = {"pass": "&#10003;", "fail": "&#10005;", "warn": "!", "todo": "&#9998;", "local": "&#8987;", "notMeasured": "&ndash;"}
INDUSTRY = {"general": "a general business", "real-estate": "a real estate agent", "lender": "a mortgage lender",
            "dentist": "a dental practice", "orthodontist": "an orthodontist", "contractor": "a contractor",
            "roofer": "a roofer", "plumber": "a plumber", "electrician": "an electrician", "hvac": "an HVAC company",
            "landscaper": "a landscaper", "pest-control": "a pest control company", "auto-repair": "an auto repair shop",
            "salon": "a salon", "barber": "a barber", "medspa": "a med spa"}
# What hurts a business most, first: invisible to Google, broken, rule-breaking, then polish.
PRIORITY = ["Can Google and AI assistants find it", "Security score", "Ownership", "Broken pages and dead ends", "Security of the software", "Real estate rules", "Lending rules",
            "Advertising rules", "Privacy", "Email trust", "Google's own test", "AI readiness", "Structured data", "Words on the page", "Looked after", "Advertising basics"]


def esc(x):
    return html.escape("" if x is None else str(x), quote=True)


def host(url):
    h = urlparse(url or "").netloc or (url or "")
    return h[4:] if h.startswith("www.") else h


def color(v):
    if v is None:
        return "var(--muted)"
    return "var(--good)" if v >= 90 else "var(--ok)" if v >= 70 else "var(--bad)"


def ring(value, letter_=None, size=168, stroke=14, label=""):
    r = (size - stroke) / 2
    c = 2 * 3.14159265 * r
    v = 0 if value is None else max(0, min(100, value))
    big = "&ndash;" if value is None else str(value)
    sub = esc(letter_) if letter_ else ""
    return ('<div class="ring" style="width:%dpx;height:%dpx" role="img" aria-label="%s">'
            '<svg viewBox="0 0 %d %d" width="%d" height="%d" aria-hidden="true">'
            '<circle cx="%g" cy="%g" r="%g" fill="none" stroke="var(--track)" stroke-width="%d"/>'
            '<circle cx="%g" cy="%g" r="%g" fill="none" stroke="%s" stroke-width="%d" stroke-linecap="round" '
            'stroke-dasharray="%.1f %.1f" transform="rotate(-90 %g %g)"/></svg>'
            '<div class="ring-in"><b style="color:%s">%s</b>%s</div></div>') % (
        size, size, esc(label or ("Score %s" % big)), size, size, size, size,
        size / 2, size / 2, r, stroke, size / 2, size / 2, r, color(value), stroke, c * v / 100, c, size / 2, size / 2,
        color(value), big, ('<span class="ring-letter">%s</span>' % sub) if sub else "")


def chip(status, mode="boss"):
    label = "Problem" if (status == "fail" and mode != "boss") else LABEL.get(status, status)  # a report that leaves BOSS names problems, not chores
    return '<span class="chip %s"><i aria-hidden="true">%s</i>%s</span>' % (esc(status), ICON.get(status, ""), esc(label))


def shot(rep):
    s = rep.get("screenshot") or ""
    if not (isinstance(s, str) and s.startswith("data:image/") and len(s) < 3_000_000):
        return ""
    return ('<figure class="phone"><img src="%s" alt="The home page of %s as a phone shows it">'
            '<figcaption>On a phone, today</figcaption></figure>') % (esc(s), esc(host(rep.get("url"))))


def prio(group):
    for i, p in enumerate(PRIORITY):
        if group.startswith(p):
            return i
    return len(PRIORITY)


# What costs the owner most, first. 0: legal exposure, or visitors and Google turned away.
# 1: what every visitor feels (slow, hard to use) and what AI needs to know the business.
# 2: findability polish. Inside a tier, the report's own group order, then how widespread.
TIER0 = {"Valid security certificate", "Secure connection (https)", "Search engines allowed in", "Pages that load",
         "No leftover template text", "Words readable without JavaScript", "No claims you would have to prove (FTC)",
         "Privacy policy page", "Tracking tools disclosed"}
TIER1 = {"Speed", "Accessibility", "Says this is a business", "On every page", "Links that go somewhere",
         "Works on a phone (viewport)", "Every link opens a real page", "Every page links to contact"}


def tier(c):
    if c["group"].startswith(("Real estate rules", "Lending rules", "Advertising rules", "Security of the software", "Security score", "Ownership")) or c["name"] in TIER0:
        return 0
    if c["name"] in TIER1 or c["group"].startswith("Google's own test"):
        return 1
    return 2


def top_fixes(rep, n=8):
    # sameCause: one problem behind several rows (a broken page fails all four of Google's
    # scores); it is listed once.
    # A security warning is listed too: "your host must confirm PHP is patched" is an action the
    # owner has to take now, even though we could not see the version from outside.
    # A red flag already says it above; it is not listed twice.
    flagged = {f.get("check") for f in rep.get("redFlags") or []}
    fails = [c for c in rep.get("checks", []) if not c.get("sameCause") and c["name"] not in flagged and (
        c["status"] == "fail" or (c["status"] == "warn" and c["group"].startswith("Security of the software")))]
    fails.sort(key=lambda c: (tier(c), prio(c["group"]), -(c.get("count") or len(c.get("pages") or []) or 1)))
    return fails[:n]


LH_NAMES = (("performance", "Speed"), ("accessibility", "Accessibility"), ("bestPractices", "Best practices"), ("seo", "SEO"))


def lh_tiles(rep):
    lh = rep.get("lighthouse") or {}
    bar = rep.get("bar") or {}
    why = rep.get("lighthouseUnavailable") or {}
    # What a missing score does to the grade, said on the tile itself.
    missing = {"failed": "counted as a failure", "excluded": "after launch" if why.get("cause") == "not-launched"
               else "left out of the grade"}.get(why.get("effect"), "not measured") if rep.get("reachable") else "not measured"
    tiles = []
    for k, nm in LH_NAMES:
        v = lh.get(k)
        target = bar.get(k)
        # A label is only ever printed with its value: no target known, no target line.
        small = esc(missing) if v is None else ("Launch target: %s" % esc(target)) if target not in (None, "") else ""
        tiles.append('<div class="tile">%s<p>%s</p>%s</div>' % (
            ring(v, None, 96, 9, "%s: %s" % (nm, missing if v is None else "%s out of 100" % v)), esc(nm),
            ("<small>%s</small>" % small) if small else ""))
    extra = ""
    if lh.get("lcp"):
        extra = '<p class="muted small">On Google\'s simulated slow phone connection, the main picture or headline appears after %s.</p>' % esc(lh["lcp"])
    src = rep.get("lighthouseSource")
    err = rep.get("lighthouseError")
    note = ('<p class="muted small">%s. Speed moves a few points between runs and computers; the other three hold steady.</p>' % esc(src)) if src else ('<p class="muted small">Google\'s test could not run: %s</p>' % esc(err) if err else "")
    if why:
        note = unavailable_note(why)
    return '<div class="tiles">%s</div>%s%s' % ("".join(tiles), extra, note)


# A site whose security turned the checker away is not in trouble (owner wording 2026-10-27).
# Grey, not the warning yellow, with a button that says how to run Google's test from the
# owner's own Chrome, which their security lets in.
BLOCKED_OK = ("Don't worry, that just means your site has good security and is blocking bots. "
              "The benefits outweigh the fact that we couldn't run this.")
RUN_IT_YOURSELF = ('<details class="howto"><summary><span aria-hidden="true">&#9432;</span> How to run Google&rsquo;s test yourself</summary>'
                   '<ol><li>Open your site in Google Chrome on a computer.</li>'
                   '<li>Right-click anywhere on the page and choose <b>Inspect</b>.</li>'
                   '<li>In the panel that opens, click the <b>Lighthouse</b> tab (it may be behind the <b>&raquo;</b> arrows).</li>'
                   '<li>Choose <b>Mobile</b>, then click <b>Analyze page load</b>.</li></ol>'
                   '<p class="muted small">It runs from your own computer, so your security lets it in. The PageSpeed website runs from '
                   'Google&rsquo;s servers and may be blocked the same way.</p></details>')


def blocked_ok():
    return '<p><b>%s</b></p>%s' % (esc(BLOCKED_OK), RUN_IT_YOURSELF)


def unavailable_note(why, reassure=True):
    """Why Google's test has no scores, in plain words, and what Lighthouse itself said.
    reassure=False when the report already said "don't worry" higher up."""
    said = ('<p class="muted small">What Google\'s test said: &ldquo;%s&rdquo;</p>' % esc(why["lighthouseSaid"])) if why.get("lighthouseSaid") else ""
    if why.get("cause") == "blocked":
        return '<div class="notice lh-why calm"><p>%s</p>%s%s</div>' % (esc(why.get("reason")), said, blocked_ok() if reassure else "")
    return '<div class="notice lh-why %s"><p>%s</p>%s</div>' % (esc(why.get("effect")), esc(why.get("reason")), said)


def platform_block(rep):
    """Red Flags, then what the site is built on when no flag already says it. Never part of the
    grade. A flag says what was found in one sentence; it is not a to-do list (owner decision
    2026-10-23)."""
    p = rep.get("platform") or {}
    flags = rep.get("redFlags") or []
    out = ""
    if flags:
        out = panel("Red Flags", '<ul class="flags">%s</ul>' % "".join(
            '<li><h4><span class="flag-mark" aria-hidden="true">&#x1F6A9;</span> %s</h4>%s<p>%s</p></li>' % (
                esc(f["title"]), '<p class="detail">%s</p>' % esc(f["line"]) if f.get("line") else "", esc(f["detail"]))
            for f in flags), "redflags")
    if p.get("line") and not any(f.get("line") for f in flags):
        out += '<div class="notice platform"><h3>What your site is built on</h3><p>%s</p></div>' % esc(p["line"])
    return out


def check_row(c, mode="boss"):
    pages = c.get("pages") or []
    pg = ('<p class="pages">Pages: %s</p>' % ", ".join("<code>%s</code>" % esc(p) for p in pages[:6])) if pages and c["status"] != "pass" else ""
    why = '<p class="why">%s</p>' % esc(c["why"]) if c.get("why") else ""
    fix = '<p class="fix"><b>Fix:</b> %s</p>' % esc(c["fix"]) if c.get("fix") and c["status"] in ("fail", "warn", "todo") else ""
    detail = ((c.get("detail") or "") + (" " + c["owner"] if c.get("owner") else "")).strip()  # inside BOSS the reader is the owner
    det = '<p class="detail">%s</p>' % esc(detail) if detail else ""
    return '<li class="check %s">%s<div><h4>%s</h4>%s%s%s%s</div></li>' % (esc(c["status"]), chip(c["status"], mode), esc(c["name"]), det, fix, pg, why)


def groups_of(rep):
    out = []
    for c in rep.get("checks", []):
        if c["group"] not in out:
            out.append(c["group"])
    return out


def panel(title, body, cls=""):
    return '<section class="panel %s"><h3 class="h3">%s</h3>%s</section>' % (cls, title, body)


def google_panel(rep, title="Google&rsquo;s own test, on a phone"):
    return panel(title, lh_tiles(rep), "google")


def single(rep, compare=False, mode="boss"):
    h = host(rep.get("url"))
    if not rep.get("reachable"):
        calm = bool(rep.get("blocked"))
        body = '<div class="panel unreadable"><p class="kicker">%s</p><h2>%s</h2><div class="notice%s"><h3>%s</h3><p>%s</p>%s</div></div>' % (
            esc(rep.get("label")), esc(h), " calm" if calm else "", esc("Could not read %s" % h), esc(rep.get("message")),
            blocked_ok() if calm else "")
        body += platform_block(rep)
        lh = rep.get("lighthouse") or {}
        if any(lh.get(k) is not None for k, _ in LH_NAMES):
            body += google_panel(rep, "Google&rsquo;s own test reached the site")
        elif rep.get("lighthouseUnavailable"):
            body += panel("Google&rsquo;s own test", unavailable_note(rep["lighthouseUnavailable"], reassure=not calm), "google")
        return '<section class="site" id="%s">%s</section>' % (esc(h), body)

    t = rep.get("totals", {})
    f = rep.get("facts", {})
    who = INDUSTRY.get(rep.get("industry"), rep.get("industry"))
    how = ("Checked as %s, because %s. If that is wrong, say what the business is and check it again: the trade decides which advertising rules apply." % (who, rep.get("industryWhy"))) if rep.get("industryAuto") else "Checked as %s." % who
    if rep.get("state"):
        how += " State rules: %s%s." % (rep["state"], (" (from %s)" % rep["stateSource"]) if rep.get("stateSource") and "chosen" not in rep["stateSource"] else "")
    held = ""
    if rep.get("overall") is not None and rep.get("averageBeforeGoogle") is not None and rep["averageBeforeGoogle"] > rep["overall"]:
        held = '<p class="muted small">The checks averaged %d. %d off because Google\'s test is under its launch target for %s.</p>' % (
            rep["averageBeforeGoogle"], rep["averageBeforeGoogle"] - rep["overall"],
            esc(", ".join({"performance": "speed", "bestPractices": "best practices", "seo": "SEO"}.get(k, k) for k in rep.get("belowBar", []))))

    grade_line = ""
    if rep.get("overall") is not None:
        grade_line = '<p class="grade-line"><b style="color:%s">%s out of 100</b> &middot; grade <b style="color:%s">%s</b></p>' % (
            color(rep["overall"]), rep["overall"], color(rep["overall"]), esc(rep.get("letter")))

    stats = [("pass", t.get("pass", 0), "passed"), ("fail", t.get("fail", 0), "to fix" if mode == "boss" else "problems"), ("warn", t.get("warn", 0), "warnings")]
    if t.get("todo"):
        stats.append(("todo", t["todo"], "to fill in"))
    stats.append(("nm", t.get("notMeasured", 0), "not measured"))
    counts = '<div class="counts">%s</div>' % "".join(
        '<p class="n %s"><b>%d</b><span>%s</span></p>' % (cls, k, label) for cls, k, label in stats)

    hero = ('<div class="panel hero"><div class="hero-score">%s</div><div class="hero-text"><p class="kicker">%s</p><h2>%s</h2>%s%s'
            '<p class="muted small">%s</p><p class="muted small">%d pages read, %d more links followed, in %d seconds.</p>%s</div>%s</div>') % (
        ring(rep.get("overall"), rep.get("letter"), label="Overall %s out of 100, grade %s" % (rep.get("overall"), rep.get("letter"))),
        esc(rep.get("label")), esc(h), grade_line, counts,
        esc(how), f.get("pagesChecked", 0), f.get("linksChecked", 0), rep.get("seconds", 0), held, shot(rep))

    fixes = top_fixes(rep)
    fix_html = ""
    if fixes:
        fix_html = panel("Fix these first" if mode == "boss" else "What we found", '<ol class="fixes">%s</ol>' % "".join(
            '<li><div><p class="grp">%s</p><h4>%s</h4><p class="detail">%s</p>%s%s</div></li>' % (
                esc(c["group"].split(" (")[0]), esc(c["name"]), esc(c.get("detail") or ""),
                '<p class="fix"><b>Fix:</b> %s</p>' % esc(c["fix"]) if c.get("fix") else "",
                ('<p class="pages">Pages: %s</p>' % ", ".join("<code>%s</code>" % esc(p) for p in (c.get("pages") or [])[:4])) if c.get("pages") else "")
            for c in fixes), "fixes-panel")
    elif not compare and not rep.get("redFlags"):
        fix_html = '<div class="notice good"><p>Nothing to fix. Every measured check passed.</p></div>'

    fix_html = platform_block(rep) + fix_html
    own = (rep.get("facts") or {}).get("ownership")
    if mode in ("owner", "boss") and own and not compare:  # registrar, name servers and host: the owner's own copy only
        fix_html += panel("Who holds your web address", "<ul class='plain'>%s</ul>" % "".join(
            "<li><b>%s</b>: %s</li>" % (esc(k), esc(v)) for k, v in (
                ("Registrar", own.get("registrar") or "not shown in the public record"),
                ("Name servers", ", ".join(own.get("nameservers") or []) or "not shown in the public record"),
                ("Host", own.get("host") or "not shown in the public record"),
                ("Registration ends", own.get("expires") or "not shown in the public record"))), "ownership")

    cats = panel("Score by area", '<div class="bars">%s</div>' % "".join(
        '<div class="bar-row"><span>%s</span><div class="bar" role="img" aria-label="%s"><i style="width:%s%%;background:%s"></i></div><b style="color:%s">%s</b></div>' % (
            esc(c["name"]), esc("%s: %s" % (c["name"], "not measured" if c["score"] is None else "%s out of 100" % c["score"])),
            0 if c["score"] is None else c["score"], color(c["score"]), color(c["score"]), "&ndash;" if c["score"] is None else c["score"])
        for c in rep.get("categories", [])), "areas")

    every = '<h3 class="h3 every-title">Every check</h3>' + "".join(
        '<details class="group"%s><summary><span>%s</span><span class="sumchips">%s</span></summary><ul class="checks">%s</ul></details>' % (
            " open" if any(c["status"] in ("fail", "todo") for c in rep["checks"] if c["group"] == g) and not compare else "",
            esc(g), "".join(chip(s, mode) + '<b class="k">%d</b>' % k for s in ("fail", "warn", "todo", "pass", "notMeasured")
                            for k in [sum(1 for c in rep["checks"] if c["group"] == g and c["status"] == s)] if k),
            "".join(check_row(c, mode) for c in rep["checks"] if c["group"] == g))
        for g in groups_of(rep))

    return '<section class="site" id="%s">%s<div class="dash-2">%s%s</div>%s%s</section>' % (
        esc(h), hero, google_panel(rep), cats, fix_html, every)


def comparison(reps):
    ok = [r for r in reps if r.get("reachable")]
    head = '<div class="duel">%s</div>' % "".join(
        '<a class="duel-card" href="#%s">%s<div><p class="kicker">%s</p><h3>%s</h3><p class="muted small">%s</p></div></a>' % (
            esc(host(r.get("url"))), ring(r.get("overall"), r.get("letter"), 120, 11) if r.get("reachable") else ring(None, None, 120, 11),
            esc(r.get("label")), esc(host(r.get("url"))),
            ("%s out of 100 (%s) &middot; %d passed &middot; %d to fix" % (r.get("overall"), esc(r.get("letter")), r["totals"]["pass"], r["totals"]["fail"])) if r.get("reachable") else esc(r.get("message")))
        for r in reps)
    if len(ok) < 2:
        return head
    names = []
    for r in ok:
        for c in r.get("categories", []):
            if c["name"] not in names:
                names.append(c["name"])
    th = "".join("<th scope='col'>%s</th>" % esc(host(r["url"])) for r in ok)
    rows = ""
    for n in names:
        cells = ""
        for r in ok:
            c = next((x for x in r["categories"] if x["name"] == n), None)
            v = None if not c else c["score"]
            cells += '<td><div class="bar sm"><i style="width:%s%%;background:%s"></i></div><b style="color:%s">%s</b></td>' % (
                0 if v is None else v, color(v), color(v), "&ndash;" if v is None else v)
        rows += "<tr><th scope='row'>%s</th>%s</tr>" % (esc(n), cells)
    return head + panel("Side by side", '<div class="tablewrap"><table class="cmp"><thead><tr><th scope="col">Area</th>%s</tr></thead><tbody>%s</tbody></table></div>' % (th, rows))


# The Krista Mashore Coaching look (krista-mashore-coaching-site/docs/DESIGN-SYSTEM.md): black and
# white, one rationed pink accent, one display weight, 16px panels, no shadows. Fonts fall back to the
# system's own, so the file still needs no internet; a host page may supply Inter by setting --sans
# and --display. Wide screens get a dashboard (1280px), phones a single column.
CSS = """
:root{--bg:#fff;--ink:#000;--muted:#374151;--subtle:#6a7282;--surface:#f6f6f7;--card:#fff;--line:#dadbdf;--track:#e4e4e7;
--pink:#ea1d76;--good:#1f7a4d;--ok:#9a6700;--bad:#b42318;--info:#1d5fa8;
--good-bg:#e5f3ea;--ok-bg:#fbf0d9;--bad-bg:#fbe7e5;--info-bg:#e4eefa;--nm-bg:#ececee;
--sans:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
--display:"Inter Tight","Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
--mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root{--bg:#000;--ink:#fff;--muted:rgba(255,255,255,.72);--subtle:rgba(255,255,255,.55);
--surface:#161618;--card:#232325;--line:rgba(255,255,255,.16);--track:#2c2c30;
--good:#5cc98e;--ok:#e3b341;--bad:#ff8a7a;--info:#7fb2ef;
--good-bg:#173226;--ok-bg:#3a2f12;--bad-bg:#3d1c19;--info-bg:#172a40;--nm-bg:#2c2c30}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 var(--sans)}
.wrap{max-width:1280px;margin:0 auto;padding:40px 40px 64px}
header.top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:16px 48px;align-items:end;padding-bottom:28px;border-bottom:1px solid var(--line);margin-bottom:28px}
header.top .muted{margin:0;max-width:68ch}
h1,h2,.h3,.duel-card h3{font-family:var(--display);font-weight:500;letter-spacing:-.04em}
h1{font-size:clamp(2rem,4.2vw,3.5rem);line-height:.95;margin:.25em 0 0;word-break:break-word}
h2{font-size:clamp(1.6rem,3vw,2.5rem);line-height:1;margin:.2em 0 .25em;word-break:break-word}
.h3{font-size:1.45rem;line-height:1.1;margin:0 0 18px}
h4{margin:0;font-size:1rem;font-weight:600;line-height:1.35}
.kicker{font:500 12px/1.3 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--subtle);margin:0;display:flex;align-items:center;gap:8px}
.kicker::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--pink);flex:none}
.grade-line{margin:2px 0 0;font-size:1.15rem}
.muted{color:var(--muted)}.small{font-size:.92rem}
.site{display:grid;gap:24px;margin:0 0 40px}
.panel{background:var(--surface);border-radius:16px;padding:28px}
.hero{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:36px;align-items:center;padding:32px 36px}
.hero-text p{margin:6px 0 0}.hero-text .counts{margin:18px 0 14px}
.ring{position:relative;flex:none}.ring svg{display:block}
.ring-in{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
.ring-in b{font:500 2.9em/1 var(--display);letter-spacing:-.04em}.tile .ring-in b{font-size:1.6em}.duel-card .ring-in b{font-size:2.1em}
.ring-letter{font:600 1rem/1 var(--sans);color:var(--muted);margin-top:6px}
.counts{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:10px;max-width:640px}
.n{margin:0;border-radius:12px;padding:10px 14px;background:var(--card);display:flex;flex-direction:column;gap:2px}
.n b{font:500 1.7rem/1 var(--display);letter-spacing:-.03em}.n span{font-size:.85rem;color:var(--muted)}
.n.pass b{color:var(--good)}.n.fail b{color:var(--bad)}.n.warn b{color:var(--ok)}.n.todo b{color:var(--info)}.n.nm b{color:var(--subtle)}
.phone{margin:0;width:168px;border:6px solid #111;border-radius:22px;overflow:hidden;background:#111}
.phone img{display:block;width:100%;height:auto}.phone figcaption{color:#ddd;font-size:11px;text-align:center;padding:4px 0}
.dash-2{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:24px;align-items:start}
.tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.tile{background:var(--card);border-radius:14px;padding:16px 8px 14px;display:flex;flex-direction:column;align-items:center;text-align:center}
.tile p{margin:10px 0 2px;font-weight:600}.tile small{color:var(--muted);font-size:.82rem;line-height:1.3}
.google .tiles+p,.google .notice{margin-top:16px}.google p.small{margin:14px 0 0}
.bars{display:grid;gap:14px}
.bar-row{display:grid;grid-template-columns:minmax(0,15em) 1fr 2.6em;gap:14px;align-items:center;font-size:.95rem}
.bar{height:10px;background:var(--track);border-radius:999px;overflow:hidden}.bar i{display:block;height:100%;border-radius:999px}
.bar.sm{height:8px;margin-bottom:4px}.bar-row b{text-align:right;font-variant-numeric:tabular-nums}
.button{display:inline-block;background:var(--ink);color:#fff;padding:14px 26px;border-radius:999px;font-weight:600;text-decoration:none}.cta{text-align:center}
.fixes{list-style:none;counter-reset:f;padding:0;margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.fixes li{counter-increment:f;display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:start;background:var(--card);border-radius:14px;padding:18px 20px}
.fixes li::before{content:counter(f);font:500 1.5rem/1 var(--display);color:var(--bad);min-width:1.2em;padding-top:2px}
.grp{margin:0 0 4px;font:500 11px/1.3 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--subtle)}
.detail{margin:4px 0 0;color:var(--muted);word-break:break-word}.fix{margin:8px 0 0}.why{margin:6px 0 0;font-size:.9rem;color:var(--subtle)}
.pages{margin:6px 0 0;font-size:.88rem;color:var(--muted);word-break:break-all}
code{font:.86em var(--mono);background:var(--nm-bg);padding:1px 5px;border-radius:5px}
.every-title{margin:16px 0 -8px}
details.group{background:var(--surface);border-radius:16px;overflow:hidden}
details.group summary{cursor:pointer;display:flex;justify-content:space-between;gap:12px;align-items:center;padding:18px 24px;font-weight:600;font-size:1.05rem;list-style:none;min-height:56px}
details.group summary::-webkit-details-marker{display:none}
details.group summary::before{content:"\\25B8";color:var(--subtle);transition:transform .15s}
details.group[open] summary::before{transform:rotate(90deg)}
details.group summary>span:first-child{flex:1}
.sumchips{display:flex;flex-wrap:wrap;gap:4px;align-items:center;justify-content:flex-end}.sumchips .chip{padding:2px 8px}.k{margin-right:8px;font-size:.88rem}
.checks{list-style:none;margin:0;padding:0 24px 24px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.check{display:grid;grid-template-columns:7.4em minmax(0,1fr);gap:12px;padding:16px 18px;background:var(--card);border-radius:12px}
.chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 10px;font-size:.8rem;font-weight:600;white-space:nowrap;height:fit-content;width:fit-content}
.chip i{font-style:normal}
.chip.pass{background:var(--good-bg);color:var(--good)}.chip.fail{background:var(--bad-bg);color:var(--bad)}
.chip.warn{background:var(--ok-bg);color:var(--ok)}.chip.todo{background:var(--info-bg);color:var(--info)}
.chip.local,.chip.notMeasured{background:var(--nm-bg);color:var(--muted)}
.notice{border-radius:14px;padding:16px 20px;background:var(--ok-bg)}
.notice p{margin:0}.notice p+p{margin-top:6px}.notice h3{margin:0 0 6px;font:600 1.05rem/1.3 var(--sans)}
.notice.good{background:var(--good-bg)}.notice.platform{background:var(--surface)}
.notice.calm{background:var(--card);border:1px solid var(--line)}.howto{margin-top:12px}.howto summary{cursor:pointer;min-height:44px;display:flex;align-items:center;gap:6px;font-weight:600;color:var(--info)}
.howto ol{margin:4px 0 0;padding-left:1.4em}.howto li{margin:4px 0}
.redflags{background:var(--bad-bg)}.redflags .h3{color:var(--bad)}.flags{list-style:none;padding:0;margin:0;display:grid;gap:14px}.flags li{background:var(--card);border-radius:14px;padding:18px 20px;border-left:4px solid var(--bad)}.flags h4{margin:0;font:600 1.05rem/1.3 var(--sans)}.flag-mark{font-weight:400}.flags p{margin:6px 0 0}.lh-why.failed{background:var(--bad-bg)}
.unreadable h2{margin-bottom:18px}
.duel{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin:0 0 24px}
.duel-card{display:flex;gap:18px;align-items:center;border-radius:16px;padding:20px;background:var(--surface);color:inherit;text-decoration:none}
.duel-card h3{margin:2px 0;font-size:1.4rem;word-break:break-word}
.tablewrap{overflow-x:auto}.cmp{width:100%;border-collapse:collapse}
.cmp th,.cmp td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle;min-width:8em}
.cmp thead th{font-size:.85rem;color:var(--muted)}
footer{margin-top:16px;color:var(--subtle);font-size:.86rem;border-top:1px solid var(--line);padding-top:20px}footer p{max-width:110ch}
a{color:var(--ink);text-decoration-color:var(--pink);text-underline-offset:3px}
@media (max-width:1100px){.dash-2{grid-template-columns:minmax(0,1fr)}header.top{grid-template-columns:minmax(0,1fr)}}
@media (max-width:900px){.fixes,.checks{grid-template-columns:minmax(0,1fr)}.hero{grid-template-columns:auto minmax(0,1fr)}.hero .phone{grid-column:1/-1;justify-self:center}}
@media (max-width:640px){.wrap{padding:24px 16px 48px}.panel{padding:20px 16px}.hero{grid-template-columns:minmax(0,1fr);justify-items:center;text-align:center;padding:24px 16px;gap:20px}
.hero .kicker{justify-content:center}.counts{grid-template-columns:repeat(2,minmax(0,1fr))}
.tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.bar-row{grid-template-columns:minmax(0,1fr) 2.6em;gap:6px 12px}.bar-row .bar{grid-column:1/-1;grid-row:2}
.check{grid-template-columns:minmax(0,1fr);padding:14px}.checks{padding:0 12px 12px}details.group summary{padding:16px;flex-wrap:wrap}
.fixes li{padding:16px}}
@media print{body{background:#fff}.panel,details.group{break-inside:auto}details.group{break-inside:avoid}details.group>*{display:block}
details:not([open]) .checks{display:grid}}
"""


REF_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "reference")


def _load_ref(name):
    try:
        with open(os.path.join(REF_DIR, name), encoding="utf-8") as f:
            j = json.load(f)
        return j if isinstance(j, dict) else None
    except (OSError, ValueError):
        return None


def rebuild_block(rep):
    """End of the public report: what a rebuilt site measured, side by side, and a way to talk to us.
    The comparison is a real, dated measurement stored in reference/seed-site.json (written by
    `audit.py --save-reference`); with no such file the section is left out, never filled in with a promise."""
    out = ""
    ref = _load_ref("seed-site.json")
    ok = (ref and isinstance(ref.get("overall"), int) and isinstance(ref.get("categories"), list)
          and str(ref.get("url", "")).startswith("https://") and ref.get("measuredAt"))
    if ok and rep.get("reachable"):
        mine = {c["name"]: c.get("score") for c in rep.get("categories", [])}
        rows = ""
        for c in ref["categories"]:
            a, b = mine.get(c.get("name")), c.get("score")
            if a is None or b is None:
                continue  # an area one side could not measure is not compared
            rows += "<tr><th scope='row'>%s</th><td><b style='color:%s'>%s</b></td><td><b style='color:%s'>%s</b></td></tr>" % (
                esc(c["name"]), color(a), a, color(b), b)
        rows = ("<tr><th scope='row'>Overall</th><td><b style='color:%s'>%s</b></td><td><b style='color:%s'>%s</b></td></tr>" % (
            color(rep.get("overall")), rep.get("overall"), color(ref["overall"]), ref["overall"])) + rows
        out += panel("Your site next to a rebuilt one", '<div class="tablewrap"><table class="cmp"><thead><tr><th scope="col">Area</th>'
                     '<th scope="col">Your site</th><th scope="col">%s</th></tr></thead><tbody>%s</tbody></table></div>'
                     '<p class="muted small">%s was measured with these same checks on %s. Your site was measured today.</p>' % (
                         esc(host(ref["url"])), rows, esc(host(ref["url"])), esc(str(ref["measuredAt"])[:10])), "rebuild")
    cta = _load_ref("cta.json") or {}
    if str(cta.get("url", "")).startswith("https://") and cta.get("label"):
        out += '<section class="panel cta"><p><a class="button" href="%s">%s</a></p></section>' % (esc(cta["url"]), esc(cta["label"]))
    return out


def render(reports, mode="boss"):
    if isinstance(reports, dict):
        reports = [reports]
    multi = len(reports) > 1
    now = datetime.now()
    when = "%s %d, %d" % (now.strftime("%B"), now.day, now.year)
    title = ("Website health: " + " vs ".join(host(r.get("url")) for r in reports)) if multi else "Website health: " + host(reports[0].get("url"))
    intro = ("The same checks a site has to pass before we let it launch: Google's own Lighthouse test, whether Google and AI "
             "assistants can find and read it, broken pages, the words on the page, the advertising rules for the trade, "
             "privacy, and whether the software the site runs on has a critical, published security flaw. Every number was measured today. Anything we could not measure is listed as not measured, never as passed.")
    if mode in ("public", "owner"):
        # What-not-how (rule ranker-what-not-how.md): the report that leaves BOSS never carries a fix line.
        # Applied here, not left to the caller, so no path can forget it.
        # The owner's copy is for the owner's own site only (the first one); a site compared with it is always public.
        reports = [security.public_view(r, owner=(mode == "owner" and i == 0)) for i, r in enumerate(reports)]
    body = (comparison(reports) if multi else "") + "".join(single(r, multi, mode) for r in reports)
    if mode in ("public", "owner") and not multi:
        body += rebuild_block(reports[0])
    caps = [r.get("caps") for r in reports if isinstance(r.get("caps"), dict)]
    cap_pages = max((c.get("pages") or 25 for c in caps), default=25)
    cap_links = max((c.get("links") or 60 for c in caps), default=60)
    return """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>%s</title><meta name="color-scheme" content="light dark"><style>%s</style></head>
<body><main class="wrap"><header class="top"><div><p class="kicker">Website health report &middot; %s</p><h1>%s</h1></div><p class="muted">%s</p></header>
%s
<footer><p>How this was measured: up to %d pages and %d links read one at a time, read-only, with a pause between requests. Google Lighthouse ran in Chrome on a simulated phone. The grade is a number out of 100: the average of the category scores, minus a quarter point for every point one of Google's four scores falls under its launch target. When Google's test cannot produce scores, the report says why: they are left out of the grade, unless the page itself is broken for real visitors, when they count as failures. A security service's check page is never scored as the site. The letter follows the number: 90+ A, 80+ B, 70+ C, 60+ D, below 60 F. The rules are the launch gate from Krista Mashore Coaching's website seeds. Website health check v%s.</p></footer>
</main></body></html>""" % (esc(title), CSS, esc(when), esc(" vs ".join(host(r.get("url")) for r in reports)) if multi else esc(host(reports[0].get("url"))),
                             esc(intro), body, cap_pages, cap_links, VERSION)
