#!/usr/bin/env python3
"""
Website health check: audit any website and draw a visual report.

    python3 audit.py <url> [<url2> <url3>] [--industry auto|real-estate|lender|dentist|...]
                     [--state CA] [--labels "Mine,Competitor"] [--out-dir DIR]
                     [--no-lighthouse] [--open]

One address: a full report on that site. Two or three: the same report for each,
side by side, the first one labelled as theirs.

Writes DIR/<site>-<date>/report.html (the visual report) and one .json per site,
prints a short summary, and ends with a line "REPORT: <path>" so whoever ran it
can open the file. Exit code 0 when at least one site was read, 2 when none was.

Standard-library Python 3.9+, no installs. Google Lighthouse runs if Node and
Chrome are on this computer (get_node.py puts a private Node in place); without
them Google's free PageSpeed service runs the same test for public sites.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import webbrowser
from datetime import datetime
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import grader  # noqa: E402
import packs  # noqa: E402
import report_html  # noqa: E402
import security  # noqa: E402


WINDOWS_RESERVED = re.compile(r"^(con|prn|aux|nul|com\d|lpt\d)(\.|$)", re.I)


def slug(url):
    h = report_html.host(url) or "site"
    out = re.sub(r"[^a-z0-9.-]+", "-", h.lower()).strip("-.")[:40].strip("-.") or "site"
    return ("site-" + out) if WINDOWS_RESERVED.match(out) else out  # "nul.com.json" is a device on Windows


def main(argv=None):
    # Windows sends output through a pipe in the local code page (cp1252), which cannot
    # print the accented words and dashes real websites contain. Never crash on a character.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    ap = argparse.ArgumentParser(description="Audit any website the way the seeds' launch gate does, and draw a visual report.")
    ap.add_argument("urls", nargs="+", help="one to three website addresses")
    ap.add_argument("--industry", default="auto", choices=["auto"] + packs.INDUSTRIES)
    ap.add_argument("--state", default="", help="two-letter US state for state advertising rules (found on the site when left out)")
    ap.add_argument("--labels", default="", help="comma-separated labels, one per address")
    ap.add_argument("--out-dir", default="website-health-reports")
    ap.add_argument("--no-lighthouse", action="store_true", help="skip Google's speed and accessibility test")
    ap.add_argument("--local", action="store_true", help="the site is unpublished, on this computer")
    ap.add_argument("--open", action="store_true", help="open the report in the default browser")
    ap.add_argument("--who", default="auto", choices=["auto", "real-estate-agent", "lender", "coach-consultant", "local-service"], help="who the owner is: real-estate-agent, lender, coach-consultant or local-service (sets the trade rules; "
                    "auto works it out from the site)")
    ap.add_argument("--public", action="store_true",
                    help="the report a stranger gets: says what is wrong and never how to fix it, counts only. Writes report.html (public) "
                    "and report-owner.html (plugin names and versions, for the owner's emailed copy). Leave it off inside BOSS, where fixes are offered.")
    ap.add_argument("--save-reference", action="store_true",
                    help="after the check, save this site's measured numbers as the rebuilt-site comparison shown at the end of public reports")
    a = ap.parse_args(argv)

    if len(a.urls) > 3:
        ap.error("at most three addresses at a time")
    state = a.state.strip().upper()
    if state and not re.match(r"^[A-Z]{2}$", state):
        ap.error("--state takes a two-letter code like CA")
    labels = [x.strip() for x in a.labels.split(",")] if a.labels else []
    defaults = ["Your website"] + ["Compared site"] * 2
    reports = []
    for i, url in enumerate(a.urls):
        label = labels[i] if i < len(labels) and labels[i] else defaults[i]
        try:
            reports.append(grader.audit(url, label, a.industry, state, a.local, lighthouse=not a.no_lighthouse, who=a.who, public=a.public))
        except Exception as e:  # one unreadable site never costs the other sites their report
            reports.append(grader.unreachable(url, label, "Something on this site stopped the check (%s). Nothing of yours is affected." % type(e).__name__))

    stamp = datetime.now().strftime("%Y-%m-%d-%H%M")
    folder = Path(a.out_dir) / ("%s-%s" % ("-vs-".join(slug(r.get("url")) for r in reports), stamp))
    folder.mkdir(parents=True, exist_ok=True)
    for i, r in enumerate(reports):
        data = dict(r)
        data.pop("lighthouseLog", None)
        name = slug(r.get("url")) if len(reports) == 1 else "%d-%s" % (i + 1, slug(r.get("url")))
        if a.public:
            # The data file next to a public report is the public version too: no fix lines, no plugin names.
            (folder / ("%s.json" % name)).write_text(json.dumps(security.public_view(data), indent=1), encoding="utf-8")
            # Only the owner's own site (the first address) gets an owner copy; anyone compared with it never does.
            (folder / ("%s-owner.json" % name)).write_text(json.dumps(security.public_view(data, owner=(i == 0)), indent=1), encoding="utf-8")
        else:
            (folder / ("%s.json" % name)).write_text(json.dumps(data, indent=1), encoding="utf-8")
    out = folder / "report.html"
    for fname, mode in ((("report.html", "public"), ("report-owner.html", "owner")) if a.public else (("report.html", "boss"),)):
        tmp = folder / (fname + ".tmp")
        tmp.write_text(report_html.render(reports, mode=mode), encoding="utf-8")
        os.replace(str(tmp), str(folder / fname))  # never leave a half-written report
    if a.save_reference:
        r0 = reports[0]
        if r0.get("reachable") and r0.get("overall") is not None and str(r0.get("url", "")).startswith("https://"):
            ref = {"url": r0["url"], "measuredAt": r0.get("measuredAt"), "overall": r0["overall"], "letter": r0.get("letter"),
                   "categories": [{"name": c["name"], "score": c["score"]} for c in r0.get("categories", []) if c.get("score") is not None]}
            refdir = Path(__file__).resolve().parent.parent / "reference"
            refdir.mkdir(exist_ok=True)
            (refdir / "seed-site.json").write_text(json.dumps(ref, indent=1), encoding="utf-8")
            print("Saved the comparison: %s (%s out of 100)" % (ref["url"], ref["overall"]))
        else:
            print("Not saved as the comparison: it must be a public https site that was read and graded.")

    for r in reports:
        if a.public:
            r = security.public_view(r)  # the screen is a public surface too
        print()
        why = (r.get("lighthouseUnavailable") or {}).get("reason")
        if not r.get("reachable"):
            print("%s  %s\n  Could not be read: %s" % (r.get("label"), r.get("url"), r.get("message")))
            print("  %s" % (r.get("platform") or {}).get("line", ""))
            if why:
                print("  Google's test: %s" % why)
            continue
        t = r["totals"]
        print("%s  %s" % (r["label"], r["url"]))
        print("  Overall: %s (%s)   %d passed, %d to fix, %d warning%s, %d not measured"
              % (r["overall"], r["letter"], t["pass"], t["fail"], t["warn"], "" if t["warn"] == 1 else "s", t["notMeasured"]))
        print("  %s" % (r.get("platform") or {}).get("line", ""))
        for f in r.get("redFlags") or []:
            print("  \U0001F6A9 %s: %s" % (f["title"], f["detail"]))
        print("  Checked as: %s (%s)%s" % (r["industry"], r["industryWhy"], ("; state rules: " + r["state"]) if r.get("state") else ""))
        for c in r["categories"]:
            print("    %-52s %s" % (c["name"], "not measured" if c["score"] is None else c["score"]))
        if why:
            print("  Google's test: %s" % why)
        elif r.get("lighthouseError"):
            print("  (Lighthouse: %s)" % r["lighthouseError"])
        fixes = report_html.top_fixes(security.public_view(r) if a.public else r, 8)
        if fixes:
            print("  %s" % ("What we found (same order as the report):" if a.public else "Fix these first (same order as the report):"))
        for c in fixes:
            print("  - %s: %s" % (c["name"], (c.get("detail") or "")[:110]))
    print("\nREPORT: %s" % out.resolve())
    if a.open:
        try:
            webbrowser.open(out.resolve().as_uri())
        except Exception:
            pass
    return 0 if any(r.get("reachable") for r in reports) else 2


if __name__ == "__main__":
    sys.exit(main())
