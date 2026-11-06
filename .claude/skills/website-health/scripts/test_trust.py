#!/usr/bin/env python3
"""
Cases for the trust checks (security score, ownership, email trust, AI readiness, looked-after), the
who-are-you choice, and the public report that says what is wrong and never how to fix it.

    python3 test_trust.py            # the pure cases only (no site served); exit code = number of failures
    (test_engine.py also runs the cases that serve fake sites, through cases(T))

Every pure case is a fixture. The ones that guard a threshold were each watched failing against a
deliberately broken copy (see the build log in VERIFICATION.md).
"""
from __future__ import annotations

import json
import re
import sys
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import security  # noqa: E402

NOW = datetime(2026, 10, 24)
FAILS = []


def _step(name, ok, detail=""):
    print("%s  %s%s" % ("PASS" if ok else "FAIL", name, ("  -- " + str(detail)[:1500]) if (detail and not ok) else ""), flush=True)
    if not ok:
        FAILS.append(name)


def by(checks, name):
    return next((c for c in checks if c["name"] == name), None)


def st(checks, name):
    c = by(checks, name)
    return c["status"] if c else None


FIVE = {"Strict-Transport-Security": "max-age=31536000", "Content-Security-Policy": "default-src 'self'", "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer"}
HTTPS = "https://example.test/"
FIX_VERBS = re.compile(r"(?:^|[.!?]\s+)(Ask|Update|Install|Enable|Turn on|Turn off|Add|Remove|Replace|Publish|Renew|Rewrite|Fix|Put|Make sure|Redirect|Change|Move|Limit|Set|Check|Open)\b")


def unit_cases(step):
    # ---- security score
    s = security.security_score(HTTPS, FIVE, "<html></html>", "https://example.test/", 90)
    step("security: all five protection settings, redirect, cert with time, no insecure files: all pass",
         all(c["status"] == "pass" for c in s), [(c["name"], c["status"]) for c in s])
    s = security.security_score(HTTPS, {"X-Frame-Options": "DENY", "X-Content-Type-Options": "nosniff"}, "", "https://example.test/", 90)
    c = by(s, "Browser protection settings")
    step("security: 2 of 5 protection settings fails and says the count", c["status"] == "fail" and "2 of 5" in c["detail"] and "3" == str(c["count"]), c)
    step("security: 3 of 5 is only a warning", st(security.security_score(HTTPS, dict(list(FIVE.items())[:3]), "", "https://x/", 90), "Browser protection settings") == "warn")
    c = by(s, "Browser protection settings")
    step("security: the public detail names no setting, the owner copy does", "HSTS" not in c["detail"] and "HSTS" in c["owner"], c)
    step("security: a site frame-ancestors in its CSP counts as frame protection",
         security.protection_settings({"Content-Security-Policy": "frame-ancestors 'none'"})["frame protection (no other site may wrap this one)"] is True)
    step("security: HSTS without max-age does not count", security.protection_settings({"Strict-Transport-Security": "includeSubDomains"})["HSTS (always use the secure connection)"] is False)
    s = security.security_score("http://example.test/", {}, "", None, None)
    step("security: a plain-http site: protection and insecure-files are not measured, never passed",
         st(s, "Browser protection settings") == "notMeasured" and st(s, "No insecure files on secure pages") == "notMeasured", [(c["name"], c["status"]) for c in s])
    step("security: http that stays http fails", st(security.security_score(HTTPS, FIVE, "", "http://example.test/", 90), "Plain http sends visitors to the secure address") == "fail")
    step("security: http not tried is not measured", st(security.security_score(HTTPS, FIVE, "", None, 90), "Plain http sends visitors to the secure address") == "notMeasured")
    for days, want in ((90, "pass"), (30, "pass"), (29, "fail"), (1, "fail"), (-3, "fail"), (None, "notMeasured")):
        step("security: certificate with %s days left is %s" % (days, want), st(security.security_score(HTTPS, FIVE, "", "https://x/", days), "Security certificate has time left") == want)
    step("security: an expired certificate says expired", "expired" in by(security.security_score(HTTPS, FIVE, "", "https://x/", -3), "Security certificate has time left")["detail"])
    c = by(security.security_score(HTTPS, FIVE, '<script src="http://cdn.example/a.js"></script><img src="http://x/a.png">', "https://x/", 90), "No insecure files on secure pages")
    step("security: an http script on an https page fails, count 2", c["status"] == "fail" and "2 files" in c["detail"], c)
    c = by(security.security_score(HTTPS, FIVE, '<img src="http://x/a.png"><img src=http://x/b.png>', "https://x/", 90), "No insecure files on secure pages")
    step("security: http images alone only warn", c["status"] == "warn" and c["count"] == 2, c)
    step("security: a canonical link to an http address is not a loaded file",
         st(security.security_score(HTTPS, FIVE, '<link rel="canonical" href="http://x/">', "https://x/", 90), "No insecure files on secure pages") == "pass")
    step("security: an http address in a comment or script body is not a loaded file",
         st(security.security_score(HTTPS, FIVE, '<!-- <script src="http://x/a.js"></script> --><script>var u="http://x/";</script>', "https://x/", 90), "No insecure files on secure pages") == "pass")
    wp = {"platform": "WordPress"}
    s = security.security_score(HTTPS, FIVE, '<meta name="generator" content="WordPress 6.4.2">', "https://x/", 90, wp, 200, 405)
    c = by(s, "WordPress does not announce its version")
    step("security: WordPress announcing its version warns; the version is owner-only", c["status"] == "warn" and "6.4.2" not in c["detail"] and "6.4.2" in c["owner"], c)
    c = by(s, "WordPress sign-in and remote-access files")
    step("security: both admin files answering warns with a count", c["status"] == "warn" and "2 of 2" in c["detail"], c)
    step("security: neither admin file answering passes", st(security.security_score(HTTPS, FIVE, "", "https://x/", 90, wp, 404, 404), "WordPress sign-in and remote-access files") == "pass")
    step("security: admin files not asked is not measured", st(security.security_score(HTTPS, FIVE, "", "https://x/", 90, wp), "WordPress sign-in and remote-access files") == "notMeasured")
    step("security: no WordPress checks on a site that is not WordPress", by(security.security_score(HTTPS, FIVE, "", "https://x/", 90, {"platform": None}), "WordPress does not announce its version") is None)

    # ---- ownership
    rec = security.parse_rdap({"events": [{"eventAction": "expiration", "eventDate": "2026-12-03T00:00:00Z"}, {"eventAction": "registration", "eventDate": "2010-01-01T00:00:00Z"}],
                               "entities": [{"roles": ["registrar"], "vcardArray": ["vcard", [["version", {}, "text", "4.0"], ["fn", {}, "text", "Example Registrar, Inc."]]]}],
                               "nameservers": [{"ldhName": "NS2.EXAMPLE.TEST"}, {"ldhName": "ns1.example.test"}]})
    step("ownership: RDAP read: expiry, registrar, nameservers", rec["expires"] == datetime(2026, 12, 3) and rec["registrar"] == "Example Registrar, Inc." and rec["nameservers"] == ["ns1.example.test", "ns2.example.test"], rec)
    c = by(security.ownership_checks(rec, NOW), "Domain registration has time left")
    step("ownership: 40 days left fails (under 60)", c["status"] == "fail" and "40 days" in c["owner"] and "40" not in c["detail"], c)
    ok = security.ownership_checks(dict(rec, expires=NOW + timedelta(days=60)), NOW)
    step("ownership: exactly 60 days left passes", ok[0]["status"] == "pass", ok)
    step("ownership: 59 days left fails", security.ownership_checks(dict(rec, expires=NOW + timedelta(days=59)), NOW)[0]["status"] == "fail")
    step("ownership: no record is not measured", security.ownership_checks(None, NOW)[0]["status"] == "notMeasured" and security.ownership_checks({"expires": None}, NOW)[0]["status"] == "notMeasured")
    step("ownership: garbage RDAP is not a crash", security.parse_rdap("nope") is None and security.parse_rdap({"events": "x", "entities": [1], "nameservers": [None]})["expires"] is None)
    f = security.ownership_facts(rec, "Example Hosting")
    step("ownership: facts hold registrar, nameservers and host for the owner copy", f["registrar"] and f["nameservers"] and f["host"] == "Example Hosting", f)

    # ---- email trust
    e = security.email_checks(["v=DMARC1; p=reject; rua=mailto:a@x.test"], ["v=spf1 include:_spf.example.test -all"])
    step("email: DMARC reject + SPF -all pass, DKIM never measured", st(e, "Email impersonation protection (DMARC)") == "pass" and st(e, "Approved email senders (SPF)") == "pass"
         and st(e, "Email signing (DKIM)") == "notMeasured", [(c["name"], c["status"]) for c in e])
    step("email: DMARC quarantine passes", st(security.email_checks(["v=DMARC1;p=quarantine"], []), "Email impersonation protection (DMARC)") == "pass")
    step("email: DMARC p=none only warns", st(security.email_checks(["v=DMARC1; p=none"], []), "Email impersonation protection (DMARC)") == "warn")
    step("email: no DMARC record fails", st(security.email_checks([], []), "Email impersonation protection (DMARC)") == "fail")
    step("email: SPF ~all passes", st(security.email_checks([], ["v=spf1 a ~all"]), "Approved email senders (SPF)") == "pass")
    step("email: SPF ?all and +all fail", st(security.email_checks([], ["v=spf1 a ?all"]), "Approved email senders (SPF)") == "fail" and st(security.email_checks([], ["v=spf1 +all"]), "Approved email senders (SPF)") == "fail")
    step("email: no SPF record fails", st(security.email_checks([], []), "Approved email senders (SPF)") == "fail")
    step("email: DNS unreadable is not measured, never a pass or a fail",
         [c["status"] for c in security.email_checks(None, None)] == ["notMeasured"] * 3)
    step("email: a TXT that only mentions dmarc is not a record", st(security.email_checks(["see v=DMARC1; p=reject elsewhere"], []), "Email impersonation protection (DMARC)") == "fail")
    j = {"Status": 0, "Answer": [{"type": 16, "data": "\"v=spf1 include:a.test \" \"-all\""}, {"type": 5, "data": "cname."}]}
    step("email: split TXT chunks are joined, CNAME rows ignored", security.txt_values(j) == ["v=spf1 include:a.test -all"], security.txt_values(j))

    # ---- AI readiness
    bots = security.blocked_ai_bots("User-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n")
    step("ai: robots turning away GPTBot and ClaudeBot: exactly those two", bots == ["GPTBot", "ClaudeBot"], bots)
    step("ai: Disallow: / for everyone turns away all four", security.blocked_ai_bots("User-agent: *\nDisallow: /\n") == list(security.AI_BOTS))
    step("ai: a bot's own Allow beats the blanket block", security.blocked_ai_bots("User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /\n") == ["ClaudeBot", "PerplexityBot", "Google-Extended"])
    step("ai: blocking one folder is not blocking the site", security.blocked_ai_bots("User-agent: *\nDisallow: /private/\n") == [])
    step("ai: shared User-agent lines form one group", security.blocked_ai_bots("User-agent: GPTBot\nUser-agent: Google-Extended\nDisallow: /\n") == ["GPTBot", "Google-Extended"])
    step("ai: comments and odd case are handled", security.blocked_ai_bots("USER-AGENT: gptbot # ours\nDISALLOW: /  # all\n") == ["GPTBot"])
    a = security.ai_checks("User-agent: GPTBot\nDisallow: /\n", [], None, [], NOW)
    c = by(a, "AI assistants are allowed in")
    step("ai: one bot turned away warns with a count; names are owner-only", c["status"] == "warn" and "1 of 4" in c["detail"] and "GPTBot" not in c["detail"] and "GPTBot" in c["owner"], c)
    step("ai: three or more turned away fails", st(security.ai_checks("User-agent: *\nDisallow: /\n", [], None, [], NOW), "AI assistants are allowed in") == "fail")
    step("ai: no robots file means nothing is turned away: pass", st(security.ai_checks("", [], None, [], NOW), "AI assistants are allowed in") == "pass")
    step("ai: robots unreadable is not measured", st(security.ai_checks(None, [], None, [], NOW), "AI assistants are allowed in") == "notMeasured")
    pages = [{"path": "/blog/how-much-is-my-home-worth-in-austin", "h1s": ["How much is my home worth in Austin?"], "paras": []},
             {"path": "/blog/spring-market-update", "h1s": ["Spring market update"], "paras": []},
             {"path": "/about", "h1s": ["About us"], "paras": []}]
    c = by(security.ai_checks("", pages, "Austin", [], NOW), "Articles open with the question and the city")
    step("ai: 1 of 2 article pages opens with the question and the city; /about is not an article", c["status"] == "warn" and "1 of 2" in c["detail"], c)
    c = by(security.ai_checks("", pages[:1], "Austin", [], NOW), "Articles open with the question and the city")
    step("ai: all article pages doing it passes", c["status"] == "pass", c)
    c = by(security.ai_checks("", pages[:1], "Dallas", [], NOW), "Articles open with the question and the city")
    step("ai: a question without the city is not enough when the city is known", c["status"] == "warn", c)
    step("ai: no article pages is not measured", st(security.ai_checks("", pages[2:], "Austin", [], NOW), "Articles open with the question and the city") == "notMeasured")
    step("ai: sitemap newest date 120 days old warns", st(security.ai_checks("", [], None, [NOW - timedelta(days=120)], NOW), "Sitemap shows recent changes") == "warn")
    step("ai: sitemap newest date 90 days old passes, 91 warns", st(security.ai_checks("", [], None, [NOW - timedelta(days=90)], NOW), "Sitemap shows recent changes") == "pass"
         and st(security.ai_checks("", [], None, [NOW - timedelta(days=91)], NOW), "Sitemap shows recent changes") == "warn")
    step("ai: the newest of several dates is the one that counts", st(security.ai_checks("", [], None, [NOW - timedelta(days=400), NOW - timedelta(days=5)], NOW), "Sitemap shows recent changes") == "pass")
    step("ai: no sitemap dates is not measured", st(security.ai_checks("", [], None, [], NOW), "Sitemap shows recent changes") == "notMeasured")

    # ---- looked after
    care = lambda text="", dates=(), out=(), nbytes=0: security.care_checks(text, list(dates), list(out), nbytes, NOW)
    step("care: copyright 2019 warns; 2024 warns; 2025 and 2026 pass; none is not measured",
         [st(care("© 2019 Acme"), "Copyright year is current"), st(care("Copyright 2024 Acme"), "Copyright year is current"), st(care("© 2025 Acme"), "Copyright year is current"),
          st(care("&copy; 2026 Acme"), "Copyright year is current"), st(care("All rights reserved"), "Copyright year is current")] == ["warn", "warn", "pass", "pass", "notMeasured"])
    step("care: a range uses its last year", security.copyright_year("© 2012-2026 Acme") == 2026 and security.copyright_year("© 2012 - 2019 Acme") == 2019)
    step("care: the year is owner-only", "2019" not in by(care("© 2019 Acme"), "Copyright year is current")["detail"] and "2019" in by(care("© 2019 Acme"), "Copyright year is current")["owner"])
    raw = '<script type="application/ld+json">{"@type":"BlogPosting","datePublished":"2025-03-01T10:00:00Z"}</script><time datetime="2026-02-02">Feb</time><meta property="article:published_time" content="2024-01-05T00:00:00Z">'
    d = security.post_dates(raw, NOW)
    step("care: post dates are read from JSON-LD, <time> and article meta", sorted(x.strftime("%Y-%m-%d") for x in d) == ["2024-01-05", "2025-03-01", "2026-02-02"], d)
    step("care: a date in the far future is ignored", security.post_dates('<time datetime="2031-01-01">', NOW) == [])
    step("care: newest post a year and a day old warns; recent passes; none is not measured",
         [st(care(dates=[NOW - timedelta(days=366)]), "Something new was posted this year"), st(care(dates=[NOW - timedelta(days=365)]), "Something new was posted this year"),
          st(care(), "Something new was posted this year")] == ["warn", "pass", "notMeasured"])
    step("care: 16 outside scripts warns, 15 passes", st(care(out=["https://a/%d.js" % i for i in range(16)], nbytes=2_000_000), "Few outside scripts") == "warn"
         and st(care(out=["https://a/%d.js" % i for i in range(15)]), "Few outside scripts") == "pass")
    step("care: outside script weight is said when known, unknown when not", "2.0 MB" in by(care(out=["https://a/1.js"], nbytes=2_000_000), "Few outside scripts")["detail"]
         and "unknown weight" in by(care(out=["https://a/1.js"], nbytes=None), "Few outside scripts")["detail"])

    # ---- who are you
    step("who: the four choices map to a trade", [security.trade_for(w)[0] for w in ("real-estate-agent", "lender", "coach-consultant", "local-service")] == ["real-estate", "lender", "general", None])
    step("who: auto and blank mean work it out", security.trade_for("auto")[0] == "auto" and security.trade_for("")[0] == "auto")
    try:
        security.trade_for("astronaut")
        step("who: an unknown choice is refused", False)
    except KeyError:
        step("who: an unknown choice is refused", True)

    # ---- red flags for the new checks
    checks = [{"name": "Security certificate has time left", "status": "fail", "group": "Security score"},
              {"name": "Domain registration has time left", "status": "fail", "group": "Ownership (public records)"},
              {"name": "Browser protection settings", "status": "fail", "group": "Security score"},
              {"name": "Domain registration has time left", "status": "pass", "group": "Ownership (public records)"}]
    f = security.red_flags(checks, {})
    step("flags: certificate under 30 days and domain under 60 days are red flags; an ordinary fail is not", [x["check"] for x in f] == ["Security certificate has time left", "Domain registration has time left"], f)


    # ---- reviewer findings, 2026-10-24 (each watched failing against the unfixed code)
    step("fix: HSTS with max-age=0 does not count", security.protection_settings({"Strict-Transport-Security": "max-age=0"})["HSTS (always use the secure connection)"] is False
         and security.protection_settings({"Strict-Transport-Security": "max-age=300; includeSubDomains"})["HSTS (always use the secure connection)"] is True)
    step("fix: two SPF records are invalid and fail; two DMARC records are invalid and fail",
         st(security.email_checks([], ["v=spf1 -all", "v=spf1 ~all"]), "Approved email senders (SPF)") == "fail"
         and st(security.email_checks(["v=DMARC1; p=reject", "v=DMARC1; p=none"], []), "Email impersonation protection (DMARC)") == "fail")
    step("fix: SPF that redirects to another record, or ends -all with an exp= modifier, is not a false fail",
         st(security.email_checks([], ["v=spf1 redirect=_spf.example.test"]), "Approved email senders (SPF)") == "pass"
         and st(security.email_checks([], ["v=spf1 a -all exp=explain.example.test"]), "Approved email senders (SPF)") == "pass")
    step("fix: a robots file with a byte-order mark still has its first group read", security.blocked_ai_bots("﻿User-agent: *\nDisallow: /\n") == list(security.AI_BOTS))
    step("fix: a domain exactly 60 days out passes even when the clock has a time of day",
         security.ownership_checks({"expires": datetime(2026, 12, 23)}, datetime(2026, 10, 24, 15, 30))[0]["status"] == "pass")
    f = security._verdict((8, 3, 30))[1] + security._verdict((7, 4, 0))[1] + security._verdict((8, 3, 36))[1] + security._verdict((9, 0, 1))[1]
    step("fix: the PHP detail states facts and never tells the reader what to do", not re.search(r"\bask (the|your) host (to|whether)|\bupdate it\b", f, re.I), f)

    # ---- public view
    rep = {"checks": [{"name": "No known attacked flaw in Elementor Pro", "status": "fail", "group": "Security of the software behind the site",
                       "detail": "Your site uses Elementor Pro 4.2.1. A critical flaw in it (CVE-2026-32475) lets an attacker in.", "why": "Elementor Pro ships a flaw.", "fix": "Update Elementor Pro to 4.2.2 or newer."},
                      {"name": "PHP is up to date (PHP2Shell)", "status": "fail", "group": "Security of the software behind the site",
                       "detail": "The site reports PHP 8.1.27. Ask the host to move it to PHP 8.4.", "why": "", "fix": "Ask your web host to move the site to PHP 8.4 or 8.5."},
                      {"name": "Browser protection settings", "status": "fail", "group": "Security score", "detail": "2 of 5 browser protection settings are in place.", "why": "", "fix": "Add them.", "owner": "Missing: HSTS."}],
           "platform": {"platform": "WordPress", "builders": ["Elementor Pro"], "phpVersion": "8.1.27", "line": "Built on WordPress with Elementor Pro, which runs on PHP."},
           "redFlags": [{"title": "Elementor Pro has a known security flaw", "detail": "The version on this site has a published flaw.", "check": "No known attacked flaw in Elementor Pro"}],
           "facts": {"ownership": {"registrar": "Example Registrar"}}}
    pub, own = security.public_view(rep), security.public_view(rep, owner=True)
    blob = json.dumps(pub)
    step("public: no fix line survives", all(c["fix"] == "" for c in pub["checks"]) and all(c["fix"] == "" for c in own["checks"]), [c["fix"] for c in pub["checks"]])
    step("public: no plugin name, no version number anywhere", not re.search(r"Elementor|Divi|\b\d+\.\d+\.\d+\b|8\.1|4\.2", blob), re.findall(r"Elementor|\b\d+\.\d+\.\d+\b", blob))
    step("public: counts and categories remain", "2 of 5" in blob and "site builder plugin" in blob and pub["platform"]["line"] == "Built on WordPress, which runs on PHP.", pub["platform"])
    step("public: the ownership facts are dropped", "ownership" not in pub["facts"] and "Example Registrar" in json.dumps(own))
    step("public: the owner copy keeps plugin names and versions, with no fix line", "Elementor Pro" in json.dumps(own) and "4.2.1" in json.dumps(own) and "Missing: HSTS" in json.dumps(own), own["checks"][0])
    step("public: no sentence in a public detail tells the reader to do something",
         not [c["detail"] for c in pub["checks"] if FIX_VERBS.search(c["detail"])], [c["detail"] for c in pub["checks"] if FIX_VERBS.search(c["detail"])])
    step("public: the Elementor flaw's CVE number and its source are not in the public view, and the 'version hidden' row is generic",
         not re.search(r"CVE-2026-32475|Wordfence", json.dumps(security.public_view(dict(rep, checks=rep["checks"] + [{"name": "Elementor Pro's version", "status": "notMeasured", "group": "x", "detail": "hides it, CVE-2026-32475 (version 4.2.2 or newer).", "why": "", "fix": ""}])))),
         security.public_view(dict(rep, checks=rep["checks"] + [{"name": "Elementor Pro's version", "status": "notMeasured", "group": "x", "detail": "CVE-2026-32475", "why": "", "fix": ""}]))["checks"][-1])
    step("public: the original report is not changed", rep["checks"][0]["fix"] and "Elementor" in rep["checks"][0]["detail"])
    flag = pub["redFlags"][0]
    step("public: a flag names no plugin and starts with a capital", flag["title"].startswith("A site builder plugin") and flag["check"] == pub["checks"][0]["name"], (flag, pub["checks"][0]["name"]))


def cases(T):
    """The cases that serve fake sites or stub the network. T is test_engine (its helpers and `step`)."""
    step, grader, report_html = T.step, T.grader, T.report_html

    def audit(site, **kw):
        srv, url = T.serve(site)
        try:
            return grader.audit(url, "t", lighthouse=False, log=lambda m: None, **kw)
        finally:
            srv.shutdown()

    # ---- a site on this computer: the new areas appear, nothing external is asked
    r = T.run("clean")
    groups = [c["name"] for c in r["categories"]]
    step("trust: the clean site is still graded A with the new areas in", r["letter"] == "A", (r["overall"], groups))
    step("trust: ownership and email are 'not measured' for a site on this computer, never passed",
         T.status(r, "Domain registration has time left") == "notMeasured" and T.status(r, "Email impersonation protection (DMARC)") == "notMeasured"
         and T.status(r, "Email signing (DKIM)") == "notMeasured")
    step("trust: AI readiness and looked-after rows are present", T.status(r, "AI assistants are allowed in") == "pass" and T.status(r, "Copyright year is current") == "notMeasured"
         and T.status(r, "Few outside scripts") == "pass", [(c["name"], c["status"]) for c in r["checks"] if c["group"] in ("AI readiness", "Looked after")])
    step("trust: a not-measured area has no score and does not drag the grade", all(c["score"] is None for c in r["categories"] if c["name"] in ("Ownership (public records)", "Email trust (DNS)")),
         [(c["name"], c["score"]) for c in r["categories"]])

    # ---- WordPress admin files, asked of the site itself, read-only
    wp = T.wordpress_site(php="8.3.36", elementor_pro="4.2.2")
    wp["/wp-login.php"] = (200, {"Content-Type": "text/html"}, "<html><body>Log in</body></html>")
    wp["/xmlrpc.php"] = (405, {"Content-Type": "text/plain"}, "XML-RPC server accepts POST requests only.")
    rw = audit(wp)
    c = T.check(rw, "WordPress sign-in and remote-access files") or {}
    step("trust: both WordPress admin files answering warns with a count", c.get("status") == "warn" and "2 of 2" in c.get("detail", ""), c)
    step("trust: the WordPress version in the generator tag is flagged, version owner-only",
         (T.check(rw, "WordPress does not announce its version") or {}).get("status") == "warn" and "6.8.3" in (T.check(rw, "WordPress does not announce its version") or {}).get("owner", ""))
    step("trust: admin files that 404 pass", T.status(T.run("wp-patched"), "WordPress sign-in and remote-access files") == "pass")

    # ---- who are you
    rr = audit(T.realtor_site())
    step("who: the realtor fixture is real estate when nothing is said", rr["industry"] == "real-estate", rr["industry"])
    rc = audit(T.realtor_site(), who="coach-consultant")
    step("who: told it is a coach, the same page is graded as a general business, no real-estate rules, and says why",
         rc["industry"] == "general" and not any(c["group"].startswith("Real estate") for c in rc["checks"]) and "coach or consultant" in rc["industryWhy"] and rc["who"] == "a coach or consultant",
         (rc["industry"], rc["industryWhy"]))
    step("who: told it is a local service business, a real estate page does not get real-estate rules", audit(T.realtor_site(), who="local-service")["industry"] == "general")
    step("who: told it is an agent, a plain page gets the real estate rules", audit(T.clean_site(), who="real-estate-agent")["industry"] == "real-estate")
    step("who: told it is a lender, it is graded as a lender", audit(T.clean_site(), who="lender")["industry"] == "lender")
    step("who: a coach is never held to Fair Housing wording", not any("Fair Housing" in c["name"] for c in rc["checks"]))
    try:
        audit(T.clean_site(), who="astronaut")
        step("who: an unknown choice is refused", False)
    except KeyError:
        step("who: an unknown choice is refused", True)

    # ---- the public report: what is wrong, never how to fix it
    ex = T.run("wp-exposed")
    boss = report_html.render([ex])
    pub = report_html.render([ex], mode="public")
    own = report_html.render([ex], mode="owner")
    body = lambda h: re.sub(r"<style>.*?</style>", "", h, flags=re.S)
    ms = T.run("messy")  # a site with plenty wrong: the findings panel exists to be retitled
    mboss, mpub = report_html.render([ms]), report_html.render([ms], mode="public")
    step("public: inside BOSS the report still offers fixes", "Fix these first" in mboss and "<b>Fix:</b>" in mboss)
    step("public: the public report has no Fix line and no 'Fix these first', and the panel is retitled", "<b>Fix:</b>" not in mpub and "Fix these first" not in mpub and "What we found" in mpub)
    step("public: the public report names no plugin and no version", not re.search(r"Elementor|4\.2\.1|8\.1\.27", body(pub)), re.findall(r"Elementor[^<]{0,40}|4\.2\.1|8\.1\.27", body(pub)))
    step("public: the owner's copy names the plugin and version and still has no Fix line", "Elementor Pro" in own and "4.2.1" in own and "<b>Fix:</b>" not in own)
    step("public: the PHP red flag is unchanged (no versions, no host questions)", "Your site runs on PHP" in pub and "Your site runs on PHP" in own and not re.search(r"ask (the|your) host", body(pub), re.I))
    pv = security.public_view(ex)
    pj = json.dumps([pv["checks"], pv["platform"], pv["redFlags"], pv["facts"]])
    step("public: the public data file has no plugin name or version number", not re.search(r"Elementor|\b\d+\.\d+\.\d+\b", pj), re.findall(r"Elementor|\b\d+\.\d+\.\d+\b", pj))
    sites = {"wp-exposed": ex, "messy": T.run("messy"), "realtor": T.run("realtor"), "lender": T.run("lender"), "dentist": T.run("dentist"), "contractor": T.run("contractor"), "clean": T.run("clean")}
    hits = [(n, c["name"], c["detail"][:90]) for n, rep in sites.items() for c in security.public_view(rep)["checks"] if FIX_VERBS.search(c.get("detail") or "")]
    step("public: no check's public detail tells the reader to do something, on seven fake sites", not hits, hits[:6])
    fixes_left = [(n, c["name"]) for n, rep in sites.items() for c in security.public_view(rep)["checks"] if c.get("fix")]
    step("public: no check keeps a fix on seven fake sites", not fixes_left, fixes_left[:5])

    # ---- the end of the report: a real measured comparison and a way to talk to us
    saved = report_html.REF_DIR
    tmp = Path(tempfile.mkdtemp())
    report_html.REF_DIR = str(tmp)
    try:
        none = report_html.render([ex], mode="public")
        step("end: with no measured seed site and no link, the section is left out, not invented", "next to a rebuilt one" not in none and 'class="button"' not in none)
        (tmp / "seed-site.json").write_text(json.dumps({"url": "https://seed.example.test/", "measuredAt": "2026-10-24T09:30", "overall": 97, "letter": "A",
                                                       "categories": [{"name": "Security score", "score": 95}, {"name": "Looked after", "score": None}]}))
        (tmp / "cta.json").write_text(json.dumps({"label": "Talk to us about a rebuilt site", "url": "https://example.test/talk"}))
        withref = report_html.render([ex], mode="public")
        step("end: the comparison shows the measured numbers and the date, and the button links to the chosen address",
             "next to a rebuilt one" in withref and ">97<" in withref and "2026-10-24" in withref and 'href="https://example.test/talk"' in withref and "Talk to us about a rebuilt site" in withref)
        step("end: an area the seed site could not be measured on is not compared", "Looked after" not in body(withref).split("rebuilt one")[1])
        step("end: inside BOSS the report has neither", "next to a rebuilt one" not in report_html.render([ex]) and 'class="button"' not in report_html.render([ex]))
        (tmp / "seed-site.json").write_text(json.dumps({"url": "http://seed.example.test/", "measuredAt": "x", "overall": 97, "categories": []}))
        (tmp / "cta.json").write_text(json.dumps({"label": "Click", "url": "javascript:alert(1)"}))
        bad = report_html.render([ex], mode="public")
        step("end: a seed file that is not a public https site, or a link that is not https, is ignored", "next to a rebuilt one" not in bad and "javascript:" not in bad)
    finally:
        report_html.REF_DIR = saved

    # ---- the glue: DNS, public records and the certificate, with the network stubbed
    log = []

    def fake_fetch(url, method="GET", limit=3_000_000):
        log.append((method, url))
        grader.STATE["headers"] = {}
        if url == "http://www.example.co.uk/":
            return 200, "https://www.example.co.uk/", ""
        if url.endswith("/robots.txt"):
            return 200, url, "User-agent: GPTBot\nDisallow: /\n"
        if url.endswith("/sitemap.xml"):
            return 200, url, "<urlset><url><loc>https://www.example.co.uk/</loc><lastmod>2026-01-02</lastmod></url></urlset>"
        if method == "HEAD":
            grader.STATE["headers"] = {"content-length": "250000"}
            return 200, url, ""
        return 404, url, ""

    old = (grader.fetch, dict(grader.EXTERNAL), grader.STATE["private_ok"], grader.PAUSE)
    real_head = grader._head_length
    heads = []
    page = {"raw": '<html><script src="https://www.googletagmanager.com/gtag.js"></script><script src="/own.js"></script></html>', "visible": "© 2019 Example",
            "path": "/", "h1s": [], "paras": [], "nodes": [{"address": {"addressLocality": "Austin"}}]}
    try:
        grader.fetch = fake_fetch
        grader._head_length = lambda u: heads.append(u) or 250000
        grader.PAUSE = 0
        grader.STATE["private_ok"] = False
        asked = {}
        grader.EXTERNAL.update(
            doh=lambda n: asked.setdefault(n, True) and (["v=DMARC1; p=none"] if n.startswith("_dmarc.") else ["google-site-verification=x", "v=spf1 include:a.test -all"]),
            rdap=lambda d: {"expires": NOW + timedelta(days=40), "registrar": "Example Registrar", "nameservers": ["ns1.example.test"]} if d == "example.co.uk" else None,
            host_of=lambda h: "Example Host", cert_days=lambda h: 12)
        t = grader.trust_gather("https://www.example.co.uk/", "www.example.co.uk", dict(FIVE), page["raw"], {"platform": None}, [page], False, NOW)
        cs = t["checks"]
        want = {"Security certificate has time left": "fail", "Plain http sends visitors to the secure address": "pass", "Domain registration has time left": "fail",
                "Email impersonation protection (DMARC)": "warn", "Approved email senders (SPF)": "pass", "Email signing (DKIM)": "notMeasured",
                "AI assistants are allowed in": "warn", "Sitemap shows recent changes": "warn", "Copyright year is current": "warn", "Few outside scripts": "pass"}
        got = {n: st(cs, n) for n in want}
        step("glue: certificate, redirect, domain, DMARC, SPF, DKIM, robots, sitemap, copyright, scripts all judged as expected", got == want, {k: (got[k], want[k]) for k in want if got[k] != want[k]})
        step("glue: the registrable domain is asked for DNS and records (co.uk handled)", "_dmarc.example.co.uk" in asked and "example.co.uk" in asked, list(asked))
        step("glue: the owner-only ownership facts are gathered", t["ownership"] == {"registrar": "Example Registrar", "nameservers": ["ns1.example.test"], "host": "Example Host", "expires": str((NOW + timedelta(days=40)).date())}, t["ownership"])
        step("glue: outside script weight is read with HEAD requests, one per outside script, never for the site's own", heads == ["https://www.googletagmanager.com/gtag.js"] and "0.2 MB" in by(cs, "Few outside scripts")["detail"], by(cs, "Few outside scripts"))
        step("glue: nothing but GET and HEAD is ever sent", {m for m, u in log} <= {"GET", "HEAD"}, {m for m, u in log})
        grader.EXTERNAL.update(doh=lambda n: None, rdap=lambda d: None, host_of=lambda h: None, cert_days=lambda h: None)
        t2 = grader.trust_gather("https://www.example.co.uk/", "www.example.co.uk", dict(FIVE), page["raw"], {"platform": None}, [page], False, NOW)
        g2 = {n: st(t2["checks"], n) for n in ("Security certificate has time left", "Domain registration has time left", "Email impersonation protection (DMARC)", "Approved email senders (SPF)")}
        step("glue: when DNS, records and the certificate cannot be read, all four are 'not measured', never passed", set(g2.values()) == {"notMeasured"}, g2)
    finally:
        grader.fetch, grader.EXTERNAL, grader.STATE["private_ok"], grader.PAUSE = old[0], old[1], old[2], old[3]
        grader._head_length = real_head
    # a hosting company's address: its records are the host's, never read as the owner's
    asked2 = []
    try:
        grader.fetch = fake_fetch
        grader.PAUSE = 0
        grader.STATE["private_ok"] = False
        grader.EXTERNAL.update(doh=lambda n: asked2.append(n) or ["v=DMARC1; p=reject"], rdap=lambda d: asked2.append(d) or {"expires": NOW + timedelta(days=900)}, host_of=lambda h: "x", cert_days=lambda h: 200)
        t3 = grader.trust_gather("https://my-site.vercel.app/", "my-site.vercel.app", dict(FIVE), page["raw"], {"platform": None}, [page], False, NOW)
        g3 = {n: st(t3["checks"], n) for n in ("Domain registration has time left", "Email impersonation protection (DMARC)", "Approved email senders (SPF)")}
        step("glue: on a hosting company's address, ownership and email are 'not measured' and nothing is looked up for it",
             set(g3.values()) == {"notMeasured"} and not asked2 and t3["ownership"] is None, (g3, asked2))
    finally:
        grader.fetch, grader.EXTERNAL, grader.STATE["private_ok"], grader.PAUSE = old[0], old[1], old[2], old[3]
    step("glue: a custom domain on a hosting company is not mistaken for one", not grader.on_hosting_address("www.example.com") and grader.on_hosting_address("a.b.vercel.app") and grader.on_hosting_address("pages.dev") and not grader.on_hosting_address("notvercel.app"))
    # a 308 redirect (Vercel's, which Python before 3.11 does not follow) must still count as a redirect to https
    hops = {"http://a.test/": (308, {"location": "https://a.test/"}), "http://b.test/": (308, {"location": "http://www.b.test/"}),
            "http://www.b.test/": (200, {}), "http://c.test/": (301, {"location": "/home"}), "http://c.test/home": (200, {}),
            "http://d.test/": (0, {})}

    def hop_fetch(url, method="GET", limit=3_000_000):
        code, hdr = hops[url]
        grader.STATE["headers"] = hdr
        return code, url, ""
    try:
        grader.fetch = hop_fetch
        grader.STATE["private_ok"] = False
        got = {h: grader._http_lands(h) for h in ("a.test", "b.test", "c.test", "d.test")}
        step("glue: http that answers 308 to https lands on https", got["a.test"] == "https://a.test/", got)
        step("glue: http that redirects only to http stays on http, a relative redirect is followed, no answer is None",
             got["b.test"] == "http://www.b.test/" and got["c.test"] == "http://c.test/home" and got["d.test"] is None, got)
    finally:
        grader.fetch, grader.STATE["private_ok"] = old[0], old[2]

    # ---- reviewer findings, 2026-10-24
    # M1: an expired certificate is reported as expired, never as 'not measured'
    import ssl as _ssl

    class _Expired(Exception):
        pass
    err = _ssl.SSLCertVerificationError(1, "certificate verify failed: certificate has expired")
    err.verify_message = "certificate has expired"
    real_ctx, real_pub, real_conn = _ssl.create_default_context, grader.public_ips, grader.socket.create_connection
    try:
        grader.public_ips = lambda h: ["93.184.216.34"]

        class _Raw:
            def __enter__(self): return self
            def __exit__(self, *a): return False

        class _Ctx:
            def wrap_socket(self, raw, server_hostname=None):
                raise err
        _ssl.create_default_context = lambda *a, **k: _Ctx()
        grader.socket.create_connection = lambda *a, **k: _Raw()
        step("M1: an expired certificate reads as expired (negative days), and the check fails", grader._cert_days("expired.example.test") == -1
             and st(security.security_score(HTTPS, FIVE, "", "https://x/", grader._cert_days("expired.example.test")), "Security certificate has time left") == "fail")
        err2 = _ssl.SSLCertVerificationError(1, "x"); err2.verify_message = "self-signed certificate"

        class _Ctx2:
            def wrap_socket(self, raw, server_hostname=None):
                raise err2
        _ssl.create_default_context = lambda *a, **k: _Ctx2()
        step("M1: a certificate that fails for another reason is 'not measured' here (the validity check reports it)", grader._cert_days("self.example.test") is None)
    finally:
        _ssl.create_default_context, grader.public_ips, grader.socket.create_connection = real_ctx, real_pub, real_conn
    # M2/M3: the public report for the exposed WordPress site
    exr = T.run("wp-exposed")
    pubh = body(report_html.render([exr], mode="public"))
    ownh = body(report_html.render([exr], mode="owner"))
    step("M2: the public report names no CVE number and no plugin security firm", not re.search(r"CVE-2026-32475|Wordfence", pubh + json.dumps(security.public_view(exr))), re.findall(r"CVE-2026-32475|Wordfence", pubh))
    step("M3: no red flag says what to do, public or owner", not [f for f in exr["redFlags"] if re.search(r"upgrade fixes|should|must|\bask\b", f["detail"], re.I)], exr["redFlags"])
    ow = security.public_view(exr, owner=True)
    step("M3: the owner copy's check details tell the reader nothing to do either", not [c["detail"] for c in ow["checks"] if FIX_VERBS.search(c.get("detail") or "") or re.search(r"update anyway", c.get("detail") or "", re.I)],
         [c["detail"] for c in ow["checks"] if FIX_VERBS.search(c.get("detail") or "")])
    step("M3: ...and every other fake site's owner copy", not [(n, c["name"]) for n, rep in sites.items() for c in security.public_view(rep, owner=True)["checks"] if FIX_VERBS.search(c.get("detail") or "")])
    # M4: only an address the owner holds is looked up
    step("M4: apex, www and a bare domain are the owner's; brokerage and country subdomains, hosting subdomains and IP numbers are not",
         [grader.owns_apex(h) for h in ("example.com", "www.example.com", "example.co.uk", "www.example.co.jp", "janedoe.kw.com", "agent.remax.com", "home.example.co.jp", "shop.example.com.sg", "123.45.67.89", "x.lpages.co")]
         == [True, True, True, True, False, False, False, False, False, False])
    log4 = []
    old4 = (grader.fetch, dict(grader.EXTERNAL), grader.STATE["private_ok"], grader.PAUSE)
    try:
        grader.fetch = lambda url, method="GET", limit=3_000_000: (log4.append(url) or (404, url, ""))
        grader.PAUSE = 0
        grader.STATE["private_ok"] = False
        asked4 = []
        grader.EXTERNAL.update(doh=lambda n: asked4.append(n) or ["v=DMARC1; p=reject"], rdap=lambda d: asked4.append(d) or {"expires": NOW + timedelta(days=900)}, host_of=lambda h: "x", cert_days=lambda h: 200)
        pg = {"raw": "<html></html>", "visible": "", "path": "/", "h1s": [], "paras": [], "nodes": []}
        t4 = grader.trust_gather("https://janedoe.kw.com/", "janedoe.kw.com", dict(FIVE), pg["raw"], {"platform": None}, [pg], False, NOW)
        step("M4: a Keller Williams-style subdomain's ownership and email are 'not measured' and nothing is looked up for kw.com",
             not asked4 and st(t4["checks"], "Domain registration has time left") == "notMeasured" and t4["ownership"] is None, asked4)
        # M5: an outside script on a numeric address is never asked about
        pg2 = dict(pg, raw='<script src="http://2130706433/internal-admin.js"></script><script src="http://0x7f000001/a.js"></script>')
        log4.clear()
        grader.trust_gather("https://www.example.com/", "www.example.com", dict(FIVE), pg2["raw"], {"platform": None}, [pg2], False, NOW)
        step("M5: a page cannot make the check reach its own computer through a script address", not [u for u in log4 if "2130706433" in u or "0x7f000001" in u], log4)
    finally:
        grader.fetch, grader.EXTERNAL, grader.STATE["private_ok"], grader.PAUSE = old4[0], old4[1], old4[2], old4[3]
    step("M5: numeric, mapped, carrier-grade and inside addresses are not public",
         not any(grader.host_is_public(h) for h in ("2130706433", "0x7f000001", "127.0.0.1", "100.64.0.1", "::ffff:127.0.0.1", "10.0.0.5", "169.254.169.254", "localhost", "0.0.0.0")))
    step("M5: a name that does not resolve is refused", not grader.host_is_public("nxdomain.invalid"))
    real_gai = grader.socket.getaddrinfo
    try:
        grader.socket.getaddrinfo = lambda h, p, *a, **k: [(2, 1, 6, "", ("93.184.216.34", 0))]
        step("M5: a public address is accepted", grader.host_is_public("example.com"))
        grader.socket.getaddrinfo = lambda h, p, *a, **k: [(2, 1, 6, "", ("93.184.216.34", 0)), (2, 1, 6, "", ("10.1.1.1", 0))]
        step("M5: a name with any inside address among its answers is refused", not grader.host_is_public("rebind.example.com"))
    finally:
        grader.socket.getaddrinfo = real_gai
    # wp-login: a redirect away or a security-service answer is not 'answers to anyone'
    fa = {"/wp-login.php": (302, "/wp-login.php"), "/wp-login.php?x": (200, "/")}
    old6 = grader.fetch
    try:
        grader.fetch = lambda url, method="GET", limit=3_000_000: (200, "https://x.test/", "")
        a = grader._admin_status("https://x.test/wp-login.php", "wp-login")
        grader.fetch = lambda url, method="GET", limit=3_000_000: (403, url, "")
        b = grader._admin_status("https://x.test/wp-login.php", "wp-login")
        grader.fetch = lambda url, method="GET", limit=3_000_000: (200, url, "")
        c2 = grader._admin_status("https://x.test/wp-login.php", "wp-login")
    finally:
        grader.fetch = old6
    step("fix: wp-login redirecting to the home page is not an open sign-in page; a security service's 403 is not measured; the real page is 200", (a, b, c2) == (404, None, 200), (a, b, c2))
    # M6: an explicit trade survives 'local service'
    step("M6: 'local service business' keeps an explicit roofer, and never becomes real estate", audit(T.realtor_site(), who="local-service", industry="roofer")["industry"] == "roofer"
         and audit(T.realtor_site(), who="local-service", industry="real-estate")["industry"] == "general")
    # M7: the five trust areas are one area of the grade
    for nm, rep in (("clean", T.run("clean")), ("messy", T.run("messy")), ("realtor", T.run("realtor"))):
        cats = rep["categories"]
        old_c = [c["score"] for c in cats if c["score"] is not None and c["name"] not in security.TRUST_GROUPS]
        tr = [c["score"] for c in cats if c["score"] is not None and c["name"] in security.TRUST_GROUPS]
        vals = old_c + ([round(sum(tr) / len(tr))] if tr else [])
        step("M7: %s: the grade counts the five trust areas as one area" % nm, rep["averageBeforeGoogle"] == round(sum(vals) / len(vals)), (rep["averageBeforeGoogle"], vals))
    seen = set()
    wh = T.run("wp-hidden")
    extra = {c["name"] for c in wh["checks"] if c["group"] == "Security score"} - {c["name"] for c in T.run("clean")["checks"] if c["group"] == "Security score"}
    step("M7: hidden versions add only the two WordPress rows to the security score, and move no other area",
         extra == {"WordPress does not announce its version", "WordPress sign-in and remote-access files"}
         and [(c["name"], c["score"]) for c in wh["categories"] if c["name"] != "Security score"] == [(c["name"], c["score"]) for c in T.run("clean")["categories"] if c["name"] != "Security score"], extra)
    # M8: the owner's emailed copy carries the ownership facts; the public one does not
    withown = json.loads(json.dumps(exr))
    withown["facts"]["ownership"] = {"registrar": "GoDaddy.com, LLC", "nameservers": ["ns1.example.test"], "host": "CLOUDFLARENET", "expires": "2027-08-09"}
    oh, ph, bh = (report_html.render([withown], mode=m) for m in ("owner", "public", "boss"))
    step("M8: the owner copy shows registrar, name servers, host and the end date", all(x in oh for x in ("GoDaddy.com, LLC", "ns1.example.test", "CLOUDFLARENET", "2027-08-09")))
    step("M8: the public report shows none of them", not any(x in ph for x in ("GoDaddy", "ns1.example.test", "CLOUDFLARENET")))
    withown["checks"].append({"name": "Browser protection settings", "status": "fail", "group": "Security score", "detail": "1 of 5 in place.", "owner": "Missing: HSTS.", "why": "", "fix": "Add them."})
    step("M8: inside BOSS the reader is the owner, so the detail naming what is missing is on the screen", "Missing: HSTS." in report_html.render([withown], mode="boss") and "Missing: HSTS." not in report_html.render([withown], mode="public"))

    # ---- second review, 2026-10-24
    # W1: the owner copy is for the first site only; a site compared with it stays public
    two = report_html.render([T.run("clean"), exr], mode="owner")
    one = report_html.render([exr, T.run("clean")], mode="owner")
    step("W1: a competitor's plugin name, version and CVE never appear in the owner's copy", not re.search(r"Elementor|4\.2\.1|CVE-2026-32475|8\.1\.27", body(two)), re.findall(r"Elementor[^<]{0,30}|CVE-2026-32475", body(two))[:3])
    step("W1: ...while the owner's own site (first) still gets its names", "Elementor Pro" in body(one))
    # W2: a script address is checked once, resolved once, never redirected
    import socket as _s, threading as _t
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
    hits = []

    class _H(BaseHTTPRequestHandler):
        def log_message(self, *a): pass
        def do_HEAD(self):
            hits.append(self.path)
            self.send_response(302); self.send_header("Location", "/internal-admin"); self.send_header("Content-Length", "123"); self.end_headers()
    srv = ThreadingHTTPServer(("127.0.0.1", 0), _H)
    _t.Thread(target=srv.serve_forever, daemon=True).start()
    real_gai = grader.socket.getaddrinfo
    try:
        grader.socket.getaddrinfo = lambda h, p, *a, **k: [(2, 1, 6, "", ("127.0.0.1", 0))] if h == "rebind.example.test" else real_gai(h, p, *a, **k)
        n1 = grader._head_length("http://rebind.example.test:%d/start.js" % srv.server_address[1])
        n2 = grader._head_length("http://127.0.0.1:%d/start.js" % srv.server_address[1])
        grader.socket.getaddrinfo = lambda h, p, *a, **k: [(2, 1, 6, "", ("93.184.216.34", 0))]
        step("W2: a name that resolves inward is never connected to", n1 is None and n2 is None and not hits, (n1, n2, hits))
        step("W2: octal, decimal and hex spellings of an address are refused outright, even if the resolver calls them public",
             not any(grader.host_is_public(h) for h in ("0177.0.0.1", "2130706433", "0x7f000001", "017700000001")))
        step("W2: the plain, canonical form of a public address is accepted", grader.host_is_public("93.184.216.34"))
    finally:
        grader.socket.getaddrinfo = real_gai
        srv.shutdown()
    # a redirect on a public host is not followed: a 302 answer is 'weight unknown', not a second request
    class _R(BaseHTTPRequestHandler):
        def log_message(self, *a): pass
        def do_HEAD(self):
            hits.append(self.path)
            self.send_response(302 if self.path == "/go" else 200); self.send_header("Location", "/second"); self.send_header("Content-Length", "50"); self.end_headers()
    srv2 = ThreadingHTTPServer(("127.0.0.1", 0), _R)
    _t.Thread(target=srv2.serve_forever, daemon=True).start()
    real_pi = grader.public_ips
    try:
        grader.public_ips = lambda h: ["127.0.0.1"]  # the vetting step stands aside so the request logic itself can be watched
        hits.clear()
        a = grader._head_length("http://s.example.test:%d/go" % srv2.server_address[1])
        b = grader._head_length("http://s.example.test:%d/ok" % srv2.server_address[1])
        step("W2: a redirecting script is weight 'unknown' and the redirect target is never requested; a plain answer gives its length", a is None and b == 50 and hits == ["/go", "/ok"], (a, b, hits))
    finally:
        grader.public_ips = real_pi
        srv2.shutdown()
    # W3: the older checks' explanations and guidance are not in the public or owner copy
    BROAD = re.compile(r"(?i)host (has|to) confirm|your host|look at the|\bmust\b|\bshould\b|never who|describe (loans|the property)|ask (the|your)")
    more = dict(sites, **{"wp-old83": T.run("wp-old83"), "wp-hidden": T.run("wp-hidden")})
    leaks = [(n, c["name"], m.group(0)) for n, rep in more.items() for mode_owner in (False, True) for c in security.public_view(rep, owner=mode_owner)["checks"]
             for m in [BROAD.search((c.get("detail") or "") + " " + (c.get("why") or ""))] if m]
    step("W3: no check's detail or explanation in the public or owner copy says what to do or what a rule requires, on nine fake sites", not leaks, leaks[:6])
    step("W3: the PHP 'version not shown' row asks nothing of the host", "host" not in (T.check(more["wp-hidden"], "Your PHP version") or {}).get("detail", "").lower())
    # W4
    e = security.email_checks(["v=DMARC1; p=reject", "v=DMARC1; p=none"], ["v=spf1 -all", "v=spf1 ~all"])
    step("W4: two records are called two records, not 'no record'", "more than one DMARC record" in by(e, "Email impersonation protection (DMARC)")["detail"]
         and "more than one SPF record" in by(e, "Approved email senders (SPF)")["detail"] and all(c["status"] == "fail" for c in e[:2]), [c["detail"] for c in e[:2]])
    # W5: the public check never asks for the admin files
    wpx = T.wordpress_site(php="8.3.36", elementor_pro="4.2.2")
    wpx["/wp-login.php"] = (200, {"Content-Type": "text/html"}, "<html>Log in</html>"); wpx["/xmlrpc.php"] = (405, {"Content-Type": "text/plain"}, "POST only")
    asked = []
    real_fetch = grader.fetch

    def spy(url, method="GET", limit=3_000_000):
        asked.append(url)
        return real_fetch(url, method, limit)
    try:
        grader.fetch = spy
        pub_r = audit(wpx, public=True)
        public_asked = [u for u in asked if "wp-login" in u or "xmlrpc" in u]
        asked.clear()
        boss_r = audit(wpx)
        boss_asked = [u for u in asked if "wp-login" in u or "xmlrpc" in u]
    finally:
        grader.fetch = real_fetch
    step("W5: the public check sends no request for wp-login.php or xmlrpc.php, and says so", not public_asked and T.status(pub_r, "WordPress sign-in and remote-access files") == "notMeasured", public_asked)
    step("W5: inside BOSS (the owner's own site) it still asks, once each", len(boss_asked) == 2 and T.status(boss_r, "WordPress sign-in and remote-access files") == "warn", boss_asked)
    # N1, N2, N6
    step("N1: IPv6 addresses are nobody's apex", not any(grader.owns_apex(h) for h in ("::1", "[::1]", "[::ffff:203.0.113.5]", "2001:db8::1", "fe80::1")))
    pr = report_html.render([ms], mode="public")
    step("N2: a report that leaves BOSS says 'Problem' where BOSS says 'Fix'", "Fix</span>" not in pr and "Problem</span>" in pr and "Fix</span>" in report_html.render([ms]))
    bo = report_html.render([withown], mode="boss")
    cmp_boss = body(report_html.render([T.run("clean"), withown], mode="boss"))
    step("N6: inside BOSS the owner sees who holds the web address; a site compared with it never shows it", "GoDaddy.com, LLC" in bo and "GoDaddy.com, LLC" not in cmp_boss)
    step("glue: registrable domain", [grader.registrable(h) for h in ("www.example.com", "a.b.example.com", "www.example.co.uk", "example.com:8080")] == ["example.com", "example.com", "example.co.uk", "example.com"])


def main():
    unit_cases(_step)
    print("\n%d failed" % len(FAILS))
    return len(FAILS)


if __name__ == "__main__":
    sys.exit(main())
