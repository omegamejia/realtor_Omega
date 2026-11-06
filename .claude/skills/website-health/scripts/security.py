"""
The software behind the site: what it is built on, and whether that software has a critical,
published security flaw. Read from the outside only: response headers, the generator tag, and the
addresses of the files a page actually loads. Nothing is probed, tried or attacked, and nothing
here touches the network.

    detect(html, headers)         -> what the site is built on, plus the PHP red flag (never part of the grade)
    assess(home_headers, pages)   -> scored checks, only for facts the site itself states

ONE MODULE, TWO ORIGINS (merged 2026-10-23)
  Krista's platform_detect.py (kits, 2026-10-23): read only the files a page loads, never words in
  its text; a version the site does not show is "not measured", never safe; a fixed version is
  still "ask the host to confirm"; the box is not graded.
  Red flag (owner decision 2026-10-23): a PHP site gets one fixed red flag that says PHP sites carry
  a risk other sites do not. It names no versions and gives no host questions or fixes.
  Jerry's security.py (engine, 2026-10-23): a dated, sourced advisory list; builders and hosted
  platforms; a PHP version the server states and that is unpatched or past end of life fails;
  Elementor Pro's attacked CVE-2026-32475.

THE ADVISORY LIST BELOW IS DATED AND SOURCED, ON PURPOSE
  A flaw goes on the list only when it is critical AND either being attacked or affecting a large
  share of sites, and only from a primary source (the software's own security team, CISA, or the
  plugin security firm that disclosed it). WordPress plugins alone get 200 to 300 new flaws a week
  (Wordfence, 2026), so this is not, and never claims to be, a full scan: the report says so out
  loud. To add next week's flaw: one entry, one test case in test_engine.py, and LIST_UPDATED.
"""
from __future__ import annotations

import re

LIST_UPDATED = "2026-10-23"

# PHP2Shell (CVE-2026-109618, CVE-2026-109619): PHP's emergency release of 21 October 2026.
# Sources: CISA alert 2026-10-21 "Critical Vulnerabilities in PHP Require Immediate Patching";
# php.net/supported-versions.php (read 2026-10-23: 8.2 is the oldest branch still fixed).
FIXED = {(8, 5): 12, (8, 4): 27, (8, 3): 36, (8, 2): 35}
OLDEST_SUPPORTED = (8, 2)
TITLE = "Your site runs on PHP"
FLAG = ("There have been security issues and breaches tied to PHP websites, most recently an emergency PHP "
        "security update on 21 Oct 2026 for two critical flaws, and attacks have been seen. This weakness is not "
        "present on sites that are not built on PHP, like BOSS-built sites that you own 100%.")

PLUGIN_ADVISORIES = [
    {
        "slug": "elementor-pro", "label": "Elementor Pro", "cve": "CVE-2026-32475",
        "published": "August 19, 2026", "exploited": True, "affected_max": (4, 2, 1), "fixed": "4.2.2",
        # Only sites with an Elementor Pro form that has a file-upload field can be attacked.
        "needs": "upload",
        "what": "lets an attacker upload a program through a form's file-upload field and take over the site",
        "sources": "Wordfence Intelligence, CVE-2026-32475 (rated 9.8), disclosed 2026-08-19; "
                   "Wordfence: exploitation since 2026-08-19, over 190,000 attempts blocked",
    },
]

PHP_PLATFORMS = ("WordPress", "Drupal", "Joomla", "Magento", "PrestaShop")
# Site builders that run inside WordPress, read from the folders their files load from.
BUILDERS = [
    ("Elementor Pro", "/wp-content/plugins/elementor-pro/"),
    ("Elementor", "/wp-content/plugins/elementor/"),
    ("Divi", "/wp-content/themes/divi/"),
    ("WPBakery", "/wp-content/plugins/js_composer/"),
    ("Beaver Builder", "/wp-content/plugins/bb-plugin/"),
    ("Avada", "/wp-content/themes/avada/"),
]
# The same builders, from the class names they stamp on the page's own markup (not words in its
# text). A caching plugin that bundles files hides the folders, not these (kristamashore.com,
# 2026-10-23: no Elementor folder loaded, "elementor-kit-13162" on the body).
BUILDER_CLASSES = [("Elementor", r"\belementor-kit-\d+"), ("Divi", r"\bet_pb_section\b|\bet-db\b"),
                   ("Beaver Builder", r"\bfl-builder\b")]
# Platforms that never run the owner's PHP: PHP flaws cannot reach these sites. Read from loaded
# file addresses (or a header the platform sends), never from words on the page.
HOSTED = [
    ("Wix", r"static\.wixstatic\.com|parastorage\.com", "x-wix-request-id"),
    ("Squarespace", r"static1\.squarespace\.com|squarespace-cdn\.com", None),
    ("Shopify", r"cdn\.shopify\.com", None),
    ("Webflow", r"website-files\.com|webflow\.com", None),
    ("GoHighLevel", r"leadconnectorhq\.com|msgsndr\.com|filesafe\.space", None),
    ("Duda", r"cdn-website\.com|multiscreensite\.com", None),
    ("Luxury Presence", r"luxurypresence\.com", None),
    ("GoDaddy Website Builder", r"img1\.wsimg\.com", None),
    ("Weebly / Square Online", r"editmysite\.com", None),
    ("HubSpot", r"hubspotusercontent|hs-scripts\.com", None),
    ("Framer", r"framerusercontent\.com", None),
]

NOT_MEASURED = {"measured": False, "platform": None, "builders": [], "hosted": None, "php": False,
                "phpVersion": None, "evidence": [], "line": "Built on: not measured, because the page could not be read.",
                "phpNote": None}


def _generator(html):
    out = []
    for tag in re.findall(r"<meta\b[^>]{0,500}>", html, re.I):
        if re.search(r"name\s*=\s*[\"']?generator[\"']?", tag, re.I):
            m = re.search(r"content\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", tag, re.I)
            if m:
                out.append(m.group(1).strip("\"'").lower())
    return " ".join(out)


def _php(headers):
    """(named, version). named: X-Powered-By names PHP. version: all three numbers, or None.
    A header saying only "PHP/8.3" gives no patch number, so the version is not measured."""
    m = re.search(r"(?<![\w.-])php(?![\w-])(?:/(\d+)\.(\d+)(?:\.(\d+))?)?", headers.get("x-powered-by", ""), re.I)
    if not m:
        return False, None
    if m.group(1) and m.group(3):
        return True, (int(m.group(1)), int(m.group(2)), int(m.group(3)))
    return True, None


def _strip(page):
    """Drop comments, script bodies (keeping the <script ...> tag itself) and style blocks, in ONE
    pass. A regex like <!--.*?--> rescans to the end of the page for every unclosed '<!--', so a
    hostile page of 150,000 of them froze the check (break-it run, 2026-10-23). An unclosed comment,
    script or style runs to the end of the page, as it does in a browser."""
    low = page.lower()
    out, i, n = [], 0, len(page)
    while i < n:
        j = low.find("<", i)
        if j < 0:
            out.append(page[i:])
            break
        out.append(page[i:j])
        if low.startswith("<!--", j):
            end = low.find("-->", j + 4)
            if end < 0:
                break
            out.append(" ")
            i = end + 3
        elif low.startswith("<script", j) or low.startswith("<style", j):
            tag = "script" if low.startswith("<script", j) else "style"
            gt = low.find(">", j)
            if gt < 0:
                break
            if tag == "script":
                out.append(page[j:gt + 1])  # the opening tag carries src=
            close = low.find("</" + tag, gt + 1)
            if close < 0:
                break
            end = low.find(">", close)
            i = end + 1 if end >= 0 else n
        else:
            out.append("<")
            i = j + 1
    return "".join(out)


def _loaded(page):
    """Addresses the page itself loads or declares (script, link, img, source, iframe tags), not words
    in its text, not links to other pages. A page that writes ABOUT WordPress does not run on it."""
    page = _strip(page)
    out = []
    for tag in re.findall(r"<(?:script|link|img|source|iframe)\b[^>]{0,2000}>", page, re.I):
        out += [v.strip("\"'").lower() for v in re.findall(r"(?:src|href|srcset|data-src)\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>\"']+)", tag, re.I)]  # quoted or bare, as minifiers write them
        if re.search(r"data-drupal-selector\s*=\s*[\"']?drupal-settings-json", tag, re.I):
            out.append("drupal-settings-json")
    return " ".join(out)


def _vtext(t):
    return ".".join(str(x) for x in t)


def _verdict(version):
    """For a PHP version the site states: ("fail", why) when it is unpatched or out of support,
    ("pass", why) when it matches a fixed release, (None, why) for a branch newer than this list."""
    v = _vtext(version)
    fixed = FIXED.get(version[:2])
    if version[:2] < OLDEST_SUPPORTED:
        return "fail", ("The site reports PHP %s. That version gets no security fixes any more, so this update will never "
                        "reach it." % v)
    if fixed is None:
        return None, ("The site reports PHP %s, a version line not in that list; whether it is still supported and covered by "
                      "this update is for the host to confirm." % v)
    if version[2] >= fixed:
        return "pass", ("The site reports PHP %s, which matches a release with the fix. The header can be out of date or "
                        "wrong, so the host has to confirm." % v)
    return "fail", ("The site reports PHP %s, which is below the fixed %d.%d.%d."
                    % (v, version[0], version[1], fixed))


def _note():
    """The PHP red flag. The same words for every PHP site, whatever version it states."""
    return {"title": TITLE, "detail": FLAG}


def detect(html, headers):
    """Read-only. html is the home page's source, headers its response headers (any case)."""
    if not isinstance(html, str) or (not html.strip() and not headers):
        return dict(NOT_MEASURED)
    headers = {str(k).lower(): str(v) for k, v in (headers or {}).items()}
    page = html[:600_000]
    low = _loaded(page)
    gen = _generator(page)
    ev = []
    platform = None
    if "wordpress" in gen or "/wp-content/" in low or "/wp-includes/" in low or "wp-json" in low:
        platform = "WordPress"
        ev = [e for e, hit in (("generator tag", "wordpress" in gen), ("wp-content files", "/wp-content/" in low or "/wp-includes/" in low),
                               ("wp-json address", "wp-json" in low)) if hit]
    elif "drupal" in gen or "drupal" in headers.get("x-generator", "").lower() or "x-drupal-cache" in headers or "drupal-settings-json" in low:
        platform = "Drupal"
        ev = ["generator tag or header"]
    elif "joomla" in gen or "/media/jui/" in low or "/components/com_" in low:
        platform = "Joomla"
        ev = ["generator tag or Joomla files"]
    elif "magento" in gen or re.search(r"/static/version\d+/frontend/", low):
        platform = "Magento"
        ev = ["Magento files"]
    elif "prestashop" in gen or "/modules/ps_" in low:
        platform = "PrestaShop"
        ev = ["generator tag or PrestaShop files"]
    elif "next.js" in headers.get("x-powered-by", "").lower() or "/_next/static/" in low:
        platform = "Next.js"
        ev = ["Next.js files or header"]
    builders = [n for n, folder in BUILDERS if folder in low] if platform == "WordPress" else []
    if platform == "WordPress":
        classes = " ".join(re.findall(r"\bclass\s*=\s*[\"']([^\"']{0,500})", _strip(page)))
        for n, pat in BUILDER_CLASSES:
            if n not in builders and not (n == "Elementor" and "Elementor Pro" in builders) and re.search(pat, classes):
                builders.append(n)
    if "Elementor Pro" in builders and "Elementor" in builders:
        builders.remove("Elementor")
    hosted = None
    if not platform:
        for name, files, header in HOSTED:
            if re.search(files, low) or (header and header in headers):
                hosted, ev = name, ["%s files" % name]
                break
    if not platform and not hosted and re.search(r"(?<![\w-])asp\.net", headers.get("x-powered-by", ""), re.I):
        hosted, ev = "Microsoft ASP.NET", ["X-Powered-By header names ASP.NET"]
    named, version = _php(headers)
    if named:
        ev.append("X-Powered-By header names PHP")
    elif re.search(r"(?<![\w-])phpsessid=", headers.get("set-cookie", ""), re.I):
        named = True  # only PHP sets a PHPSESSID cookie
        ev.append("a PHPSESSID cookie")
    php = platform in PHP_PLATFORMS or named
    name = platform + (" with " + " and ".join(builders) if builders else "") if platform else None
    if platform in PHP_PLATFORMS:
        line = "Built on %s, which runs on PHP." % name
    elif platform:
        line = "Built on %s." % name
    elif hosted:
        line = "Built on %s, which does not run PHP for you, so PHP flaws do not reach it." % hosted
    elif named:
        line = "Runs on PHP; the site's own %s says so." % ("header" if "X-Powered-By header names PHP" in ev else "cookie")
    else:
        line = "Platform not recognised: nothing on the page or in its headers names one."
    return {"measured": True, "platform": platform, "builders": builders, "hosted": hosted, "php": php,
            "phpVersion": _vtext(version) if version else None, "evidence": ev, "line": line,
            "phpNote": _note() if php else None}


class _VerMatch:
    """The highest version seen, shaped like a regex match."""

    def __init__(self, v):
        self.v = v

    def group(self, _):
        return _vtext(self.v)


def _ver(s):
    return tuple(int(x) for x in s.split("."))


def assess(home_headers, pages):
    """Scored checks, only for facts the site states outright: a PHP version in a header, a plugin
    version on its own files. Returns ([(name, status, detail, why, fix)], platform). A version the
    site hides is never scored (it goes under "Not measured"), so it can never lower the grade."""
    home = pages[0] if pages else {}
    platform = detect(home.get("raw") or "", home_headers)
    # The site's own page addresses ending in .php (index.php, contact.php) are PHP running on it.
    # Same-site links only (the grader's "internal" list): a link to someone else's .php is not.
    php_pages = sorted({u for p in pages[:25] for u in (p.get("internal") or [])
                        if isinstance(u, str) and re.search(r"\.php$", u.split("?")[0].split("#")[0], re.I)})
    if php_pages and not platform["php"] and not platform["hosted"] and platform["measured"]:
        platform = dict(platform, php=True, phpNote=_note(), evidence=platform["evidence"] + ["its own pages end in .php"],
                        line="Runs on PHP: the site's own pages end in .php." if not platform["platform"] else platform["line"])
    out = []
    named, version = _php({str(k).lower(): str(v) for k, v in (home_headers or {}).items()})
    if version:
        st, why_v = _verdict(version)
        if st:
            fix = "" if st == "pass" else (
                "Ask your web host to move the site to PHP 8.4 or 8.5." if version[:2] < OLDEST_SUPPORTED
                else "Ask your web host to update PHP to %d.%d.%d or newer today." % (version[0], version[1], FIXED[version[:2]]))
            out.append(("PHP is up to date (PHP2Shell)", st, why_v,
                        "Two critical PHP flaws (CVE-2026-109618 and CVE-2026-109619) were fixed on 21 Oct 2026 and attacks "
                        "have been seen. They let an attacker run their own code on the server. Source: CISA, 21 Oct 2026.", fix))
    if platform.get("platform") == "WordPress":
        blob = "\n".join((p.get("raw") or "")[:300000] for p in pages[:25])
        loaded = _loaded(blob)
        for adv in PLUGIN_ADVISORIES:
            folder = "/wp-content/plugins/%s/" % adv["slug"]
            if folder not in loaded:
                continue
            # A plugin's folder also carries the libraries it bundles, each with its own ?ver=
            # (Elementor Pro ships one at 1.2.1). The plugin's own number is the highest.
            # Measured 2026-10-23: nashvilleroofingco.com shows ?ver=1.2.1 and ?ver=4.3.2.
            found = sorted({_ver(v) for v in re.findall(re.escape(folder) + r"[^\s\"'<>?]*\?ver=(\d+\.\d+(?:\.\d+)?)", loaded)})
            if not found:
                continue  # version hidden: listed under "Not measured" by the grader, never scored
            vm = _VerMatch(found[-1])
            upload = bool(re.search(r"<input[^>]{0,300}type=[\"']?file|elementor-field-type-upload", blob, re.I))
            name = "No known attacked flaw in %s" % adv["label"]
            why = "Site builders and plugins run inside your website: a flaw in one is a flaw in your site. " + adv["sources"]
            if found[-1] > adv["affected_max"]:
                out.append((name, "pass", "%s %s includes the fix for %s." % (adv["label"], vm.group(1), adv["cve"]), why, ""))
                continue
            exposed = adv.get("needs") != "upload" or upload
            out.append((name, "fail" if exposed else "warn",
                        "Your site uses %s %s. A critical flaw in it (%s), published %s%s, %s.%s" % (
                            adv["label"], vm.group(1), adv["cve"], adv["published"], " and under attack since" if adv["exploited"] else "",
                            adv["what"], "" if exposed else " We saw no file-upload field on the pages we read, so it may not be reachable."),
                        why, "Update %s to %s or newer (WordPress, then Plugins), then ask whoever runs the site to check the uploads "
                             "folder for .php files that should not be there." % (adv["label"], adv["fixed"])))
    return out, platform


# ---- Red flags (owner decision 2026-10-23) -------------------------------------------------
# Things worth worrying about, said in one plain sentence each. Not advice and not a to-do list:
# no steps, no versions, no fixes beyond "an upgrade fixes it". Only failed checks become flags
# (and, for the software behind the site, warnings too); a blank to fill in never does.
RED_FLAG_CHECKS = {
    "Secure connection (https)": ("No padlock", "Browsers tell visitors this site is not secure."),
    "Valid security certificate": ("Broken security certificate", "Browsers show visitors a full-page warning before the site opens."),
    "Search engines allowed in": ("Hidden from Google", "The site tells search engines not to list it."),
    "Fair Housing language": ("Possible Fair Housing problem", "Some wording on the site can read as favoring or excluding certain people."),
    "Fair lending language": ("Possible fair lending problem", "Some wording on the site can read as favoring or excluding certain people."),
    "License number on every page": ("License number missing", "Advertising rules require it, and some pages do not show it."),
    "NMLS number on every page": ("NMLS number missing", "Lending ads must show it, and some pages do not."),
    "Company NMLS number on every page": ("Company NMLS number missing", "Lending ads must show it, and some pages do not."),
    "Equal Housing Lender on every page": ("Equal Housing Lender missing", "Lending ads must carry it, and some pages do not."),
    "Privacy policy page": ("No privacy policy", "Privacy laws expect one on a site that collects names or emails."),
    "Plain http sends visitors to the secure address": ("Insecure version still open", "Visitors who type the plain address stay on the insecure version of the site."),
    "Security certificate has time left": ("Security certificate ending", "Browsers show visitors a full-page warning once the certificate runs out."),
    "No insecure files on secure pages": ("Insecure files on a secure page", "Scripts or styles load over an insecure connection, so the padlock cannot be trusted."),
    "Domain registration has time left": ("Domain registration ending", "If it lapses, the website and every email at this address stop working."),
    "Email impersonation protection (DMARC)": ("No email impersonation protection", "Anyone can send email that looks like it came from this address."),
}


# Rules that only apply to one trade. Their flags need the trade to be known, not guessed from a
# word count: wix.com's home page says "real estate" ten times and it needs no license number.
TRADE_FLAG_CHECKS = {"Fair Housing language", "Fair lending language", "License number on every page",
                     "NMLS number on every page", "Company NMLS number on every page", "Equal Housing Lender on every page"}


def _flag_for(c, trade_sure):
    name, status = c.get("name", ""), c.get("status")
    trade_rule = name in TRADE_FLAG_CHECKS or (name.startswith("Claims ") and name.endswith(" does not allow"))
    if trade_rule and not trade_sure:
        return None
    if status == "fail" and name in RED_FLAG_CHECKS:
        return RED_FLAG_CHECKS[name]
    if status == "fail" and name.startswith("Claims ") and name.endswith(" does not allow"):
        return ("Claims the state does not allow", "Some wording makes claims the state's advertising rules do not allow.")
    if status in ("fail", "warn") and (c.get("group") or "").startswith("Security of the software"):
        if name.startswith("No known attacked flaw in "):
            return ("%s has a known security flaw" % name[len("No known attacked flaw in "):],
                    "The version on this site has a published, critical security flaw.")
        if name.startswith("PHP is up to date"):
            return ("Out-of-date PHP", "The site reports a PHP version without the latest security fixes.")
    return None


def red_flags(checks, platform, trade_sure=True):
    """The report's Red Flags: the PHP flag first, then one per worrying check, in check order.
    Each is {"title", "detail", "check"} ("line" too for PHP: what the site is built on).
    trade_sure: False when the trade was only guessed from words, which drops trade-rule flags."""
    out = []
    note = (platform or {}).get("phpNote")
    if note:
        out.append({"title": note["title"], "line": platform.get("line", ""), "detail": note["detail"], "check": None})
    for c in checks or []:
        f = _flag_for(c, trade_sure)
        if f:
            out.append({"title": f[0], "detail": f[1], "check": c["name"]})
    return out


# ================================================================================================
# THE TRUST CHECKS (added 2026-10-24): five more areas that say what is wrong with a site, read from
# the outside. Pure functions: the grader fetches, these judge. Nothing here touches the network, so
# every one has a fixture (test_trust.py) that was watched failing.
#
# WHAT-NOT-HOW (owner decision 2026-10-24, rule ranker-what-not-how.md): every check carries a
# `detail` that says what is wrong, plus a `fix` the report only shows INSIDE a student's BOSS. The
# public report (public_view) drops every fix and shows counts and categories; exact plugin and theme
# names and versions go only in the owner's emailed copy (owner_view). `detail` is written as counts;
# `owner` holds the names. A check that could not be read is "notMeasured", never a pass.
# ================================================================================================
from datetime import datetime, timedelta  # noqa: E402

G_SEC = "Security score"
G_OWN = "Ownership (public records)"
G_MAIL = "Email trust (DNS)"
G_AI = "AI readiness"
G_CARE = "Looked after"
TRUST_GROUPS = (G_SEC, G_OWN, G_MAIL, G_AI, G_CARE)

CERT_MIN_DAYS = 30      # a certificate with fewer days left is a red flag
DOMAIN_MIN_DAYS = 60    # a domain registration with fewer days left is a red flag
SITEMAP_MAX_AGE = 90
POST_MAX_AGE = 365
OUTSIDE_SCRIPTS_MAX = 15
AI_BOTS = ("GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended")


def _chk(group, name, status, detail, why="", fix="", owner=None, count=None):
    """One check, in the shape the grader's Report.add takes (plus `owner`: detail for the owner's copy)."""
    return {"group": group, "name": name, "status": status, "detail": detail, "why": why, "fix": fix,
            "owner": owner, "count": count}


def _nm(group, name, detail):
    return _chk(group, name, "notMeasured", detail)


# ---- Security score ----------------------------------------------------------------------------
def protection_settings(headers):
    """Which of the five browser protection settings the home page's answer carries."""
    h = {str(k).lower(): str(v) for k, v in (headers or {}).items()}
    csp = h.get("content-security-policy", "")
    have = {
        "HSTS (always use the secure connection)": bool(re.search(r"max-age\s*=\s*\"?[1-9]\d*", h.get("strict-transport-security", ""), re.I)),
        "content-security-policy (which outside files may load)": bool(csp.strip()),
        "frame protection (no other site may wrap this one)": bool(h.get("x-frame-options", "").strip()) or "frame-ancestors" in csp.lower(),
        "content-type protection (nosniff)": "nosniff" in h.get("x-content-type-options", "").lower(),
        "referrer policy (what is shared when a visitor leaves)": bool(h.get("referrer-policy", "").strip()),
    }
    return have


def _mixed(page):
    """(active, passive): http:// files an https page loads. Active (script, style, frame) can be
    swapped by anyone on the network; passive (image) is only a broken padlock."""
    active = passive = 0
    for m in re.finditer(r"<(script|link|iframe|img|source)\b[^>]{0,2000}>", _strip(page[:600_000]), re.I):
        tag, body = m.group(1).lower(), m.group(0)
        if tag == "link" and not re.search(r"rel\s*=\s*[\"']?[^\"'>]*(stylesheet|preload|modulepreload)", body, re.I):
            continue
        n = sum(v.lower().count("http://") for v in re.findall(r"(?:src|href|srcset|data-src)\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>\"']+)", body, re.I))
        if tag in ("img", "source"):
            passive += n
        else:
            active += n
    return active, passive


def wp_version(html):
    m = re.search(r"wordpress\s+(\d+(?:\.\d+)*)", _generator(html[:600_000]))
    return m.group(1) if m else None


def security_score(home_url, headers, html, http_final=None, cert_days=None, platform=None,
                   login_status=None, xmlrpc_status=None):
    """The security-score checks. home_url: the address the home page was read from. http_final: where
    plain http:// ended up (None = not tried). cert_days: days left on the certificate (None = unread).
    login_status / xmlrpc_status: the HTTP status of the two WordPress files (None = not asked)."""
    out = []
    https = str(home_url).lower().startswith("https://")
    if http_final is None:
        out.append(_nm(G_SEC, "Plain http sends visitors to the secure address", "Not tried: the site was not on the internet or the secure address did not answer."))
    elif str(http_final).lower().startswith("https://"):
        out.append(_chk(G_SEC, "Plain http sends visitors to the secure address", "pass", "Visitors who type the plain address end up on the secure one."))
    else:
        out.append(_chk(G_SEC, "Plain http sends visitors to the secure address", "fail",
                        "Visitors who type the plain address stay on the insecure version of the site.",
                        why="Browsers mark the insecure version as not secure, and anything a visitor types there can be read.",
                        fix="Redirect http to https with your host (usually one switch)."))
    if cert_days is None:
        out.append(_nm(G_SEC, "Security certificate has time left", "The certificate's end date could not be read."))
    elif cert_days < 0:
        out.append(_chk(G_SEC, "Security certificate has time left", "fail", "The security certificate has expired.",
                        why="Browsers show visitors a full-page warning before the site opens.", fix="Renew the certificate with your host."))
    elif cert_days < CERT_MIN_DAYS:
        out.append(_chk(G_SEC, "Security certificate has time left", "fail",
                        "The security certificate runs out in under %d days." % CERT_MIN_DAYS,
                        why="When it runs out, browsers show visitors a full-page warning before the site opens.",
                        fix="Renew the certificate with your host, and turn on automatic renewal.", owner="%d days left." % cert_days))
    else:
        out.append(_chk(G_SEC, "Security certificate has time left", "pass", "The security certificate has more than %d days left." % CERT_MIN_DAYS))
    if not https:
        out.append(_nm(G_SEC, "Browser protection settings", "Only measured on the secure address."))
        out.append(_nm(G_SEC, "No insecure files on secure pages", "Only measured on the secure address."))
    else:
        have = protection_settings(headers)
        n = sum(have.values())
        missing = [k for k, v in have.items() if not v]
        out.append(_chk(G_SEC, "Browser protection settings", "pass" if n == 5 else ("warn" if n >= 3 else "fail"),
                        "%d of 5 browser protection settings are in place." % n,
                        why="These are instructions the site gives every browser to keep visitors safer from tampering and impersonation.",
                        fix="Ask your host to add the missing settings: %s." % "; ".join(missing) if missing else "",
                        owner="Missing: %s." % "; ".join(missing) if missing else "All five are in place.", count=5 - n))
        a, p = _mixed(html or "")
        if a:
            out.append(_chk(G_SEC, "No insecure files on secure pages", "fail",
                            "The home page loads %d file%s over an insecure connection." % (a + p, "" if a + p == 1 else "s"),
                            why="An insecure script or style file on a secure page can be swapped by anyone on the same network.",
                            fix="Change every http:// address the page loads to https://.", count=a + p))
        elif p:
            out.append(_chk(G_SEC, "No insecure files on secure pages", "warn",
                            "The home page loads %d image%s over an insecure connection." % (p, "" if p == 1 else "s"),
                            why="The padlock shows as broken to visitors.", fix="Change every http:// image address to https://.", count=p))
        else:
            out.append(_chk(G_SEC, "No insecure files on secure pages", "pass", "Every file the home page loads is secure."))
    if (platform or {}).get("platform") == "WordPress":
        v = wp_version(html or "")
        if v:
            out.append(_chk(G_SEC, "WordPress does not announce its version", "warn",
                            "The site tells every visitor which WordPress version it runs.",
                            why="It tells anyone looking which known flaws to try.", fix="Remove the generator tag from the page head.",
                            owner="It announces WordPress %s." % v))
        else:
            out.append(_chk(G_SEC, "WordPress does not announce its version", "pass", "The site does not announce its WordPress version."))
        if login_status is None and xmlrpc_status is None:
            out.append(_nm(G_SEC, "WordPress sign-in and remote-access files", "Not asked."))
        else:
            open_ = []
            if login_status in (200, 302, 301):
                open_.append("sign-in page (wp-login.php)")
            if xmlrpc_status in (200, 405):
                open_.append("remote-access file (xmlrpc.php)")
            asked = (login_status is not None) + (xmlrpc_status is not None)
            if open_:
                out.append(_chk(G_SEC, "WordPress sign-in and remote-access files", "warn",
                                "%d of %d WordPress admin files answer to anyone." % (len(open_), asked),
                                why="Both are where automated password-guessing attacks aim first.",
                                fix="Limit sign-in attempts, and turn off xmlrpc.php if nothing uses it.", owner="Answering: %s." % "; ".join(open_), count=len(open_)))
            else:
                out.append(_chk(G_SEC, "WordPress sign-in and remote-access files", "pass", "Neither WordPress admin file answers to anyone."))
    return out


# ---- Ownership, from public records -----------------------------------------------------------
def parse_rdap(j):
    """RDAP domain record -> {"expires", "registrar", "nameservers"} (None where the record is silent)."""
    if not isinstance(j, dict):
        return None
    exp = None
    for e in j.get("events") or []:
        if isinstance(e, dict) and str(e.get("eventAction", "")).lower() == "expiration":
            try:
                exp = datetime.strptime(str(e.get("eventDate", ""))[:10], "%Y-%m-%d")
            except ValueError:
                pass
    reg = None
    for ent in j.get("entities") or []:
        if isinstance(ent, dict) and "registrar" in (ent.get("roles") or []):
            try:
                for row in ent["vcardArray"][1]:
                    if row[0] == "fn":
                        reg = str(row[3])[:80]
            except (KeyError, IndexError, TypeError):
                pass
    ns = sorted({str(n.get("ldhName", "")).lower()[:80] for n in (j.get("nameservers") or []) if isinstance(n, dict) and n.get("ldhName")})
    return {"expires": exp, "registrar": reg, "nameservers": ns}


def ownership_checks(record, now):
    if not record or not record.get("expires"):
        return [_nm(G_OWN, "Domain registration has time left", "The public record for this address did not give an end date.")]
    days = (record["expires"].date() - now.date()).days
    if days < DOMAIN_MIN_DAYS:
        return [_chk(G_OWN, "Domain registration has time left", "fail",
                     "The address registration ends in under %d days." % DOMAIN_MIN_DAYS,
                     why="If it lapses, the website and every email at this address stop working, and someone else can buy the name.",
                     fix="Renew the domain with its registrar and turn on auto-renew.", owner="Ends in %d days (%s)." % (days, record["expires"].date()))]
    return [_chk(G_OWN, "Domain registration has time left", "pass", "The address registration has more than %d days left." % DOMAIN_MIN_DAYS,
                 owner="Ends in %d days (%s)." % (days, record["expires"].date()))]


def ownership_facts(record, host_name=None):
    """Who holds the address: owner copy only, never in the public report."""
    r = record or {}
    return {"registrar": r.get("registrar"), "nameservers": r.get("nameservers") or [], "host": host_name,
            "expires": str(r["expires"].date()) if r.get("expires") else None}


# ---- Email trust, from DNS --------------------------------------------------------------------
def txt_values(doh_json):
    """TXT strings out of a DNS-over-HTTPS JSON answer (the quoted chunks joined)."""
    out = []
    for a in (doh_json or {}).get("Answer") or [] if isinstance(doh_json, dict) else []:
        if isinstance(a, dict) and a.get("type", 16) == 16:
            out.append("".join(re.findall(r'"([^"]*)"', str(a.get("data", "")))) or str(a.get("data", "")).strip('"'))
    return out


def email_checks(dmarc_txts, spf_txts):
    """dmarc_txts / spf_txts: lists of TXT strings, [] when the record is absent, None when DNS could not be read."""
    out = []
    if dmarc_txts is None:
        out.append(_nm(G_MAIL, "Email impersonation protection (DMARC)", "The address's email records could not be read."))
    else:
        recs = [t for t in dmarc_txts if t.lower().lstrip().startswith("v=dmarc1")]
        rec = recs[0] if len(recs) == 1 else None  # more than one record is invalid, and mail systems ignore both
        pol = re.search(r"\bp\s*=\s*(\w+)", rec or "", re.I)
        pol = pol.group(1).lower() if pol else None
        why = "Without it, anyone can send email that looks like it came from this address, and mailbox providers send more of the real mail to spam."
        if pol in ("quarantine", "reject"):
            out.append(_chk(G_MAIL, "Email impersonation protection (DMARC)", "pass", "A DMARC policy is set to stop impersonation."))
        elif pol == "none":
            out.append(_chk(G_MAIL, "Email impersonation protection (DMARC)", "warn", "A DMARC record exists but only watches; it does not stop impersonation.",
                            why=why, fix="Move the DMARC policy from none to quarantine, then reject."))
        elif len(recs) > 1:
            out.append(_chk(G_MAIL, "Email impersonation protection (DMARC)", "fail", "There is more than one DMARC record, which makes all of them invalid.", why=why,
                            fix="Keep one DMARC record and remove the others."))
        else:
            out.append(_chk(G_MAIL, "Email impersonation protection (DMARC)", "fail", "There is no DMARC record.", why=why,
                            fix="Publish a DMARC record for this address."))
    if spf_txts is None:
        out.append(_nm(G_MAIL, "Approved email senders (SPF)", "The address's email records could not be read."))
    else:
        recs = [t for t in spf_txts if t.lower().lstrip().startswith("v=spf1")]
        rec = recs[0] if len(recs) == 1 else None  # more than one SPF record is invalid and ignored
        why = "SPF lists who may send email as this address; without a firm ending, forged mail passes."
        if rec and (re.search(r"\s[-~]all(\s+exp=\S+)?\s*$", rec.strip().lower()) or re.search(r"\sredirect=\S+", rec.lower())):
            out.append(_chk(G_MAIL, "Approved email senders (SPF)", "pass", "An SPF record lists the approved senders and ends firmly."))
        elif rec:
            out.append(_chk(G_MAIL, "Approved email senders (SPF)", "fail", "An SPF record exists but does not end by refusing everyone else.", why=why,
                            fix="End the SPF record with -all (or ~all)."))
        elif len(recs) > 1:
            out.append(_chk(G_MAIL, "Approved email senders (SPF)", "fail", "There is more than one SPF record, which makes all of them invalid.", why=why, fix="Keep one SPF record and merge the others into it."))
        else:
            out.append(_chk(G_MAIL, "Approved email senders (SPF)", "fail", "There is no SPF record.", why=why, fix="Publish an SPF record for this address."))
    out.append(_nm(G_MAIL, "Email signing (DKIM)", "Not measured: the name of the signing key is private to whoever sends the email, so it cannot be looked up from outside."))
    return out


# ---- AI readiness ------------------------------------------------------------------------------
def blocked_ai_bots(robots):
    """The AI_BOTS a robots file turns away from the whole site. A bot's own group wins; with none, '*'."""
    groups, cur, in_agents = [], None, False
    for line in (robots or "").lstrip("\ufeff")[:200000].splitlines()[:5000]:
        line = line.split("#", 1)[0].strip()
        if ":" not in line:
            continue
        k, v = (s.strip() for s in line.split(":", 1))
        k = k.lower()
        if k == "user-agent":
            if not in_agents:
                cur = {"agents": [], "allow": False, "disallow": False}
                groups.append(cur)
            cur["agents"].append(v.lower())
            in_agents = True
        elif cur is not None and k in ("allow", "disallow"):
            in_agents = False
            if v == "/":
                cur["allow" if k == "allow" else "disallow"] = True
    out = []
    for bot in AI_BOTS:
        own = [g for g in groups if bot.lower() in g["agents"]] or [g for g in groups if "*" in g["agents"]]
        if any(g["disallow"] and not g["allow"] for g in own):
            out.append(bot)
    return out


QUESTION_START = re.compile(r"^(how|what|why|when|where|who|which|can|should|is|are|do|does|will|would|could)\b", re.I)
CONTENT_PATH = re.compile(r"/(blog|articles?|posts?|faqs?|guides?|news|learn|resources)(/|$)", re.I)


def opens_with_question(opening):
    t = (opening or "").strip()
    return t.endswith("?") or bool(QUESTION_START.match(t))


def ai_checks(robots, pages, city, sitemap_dates, now):
    """robots: robots.txt text ('' when there is none, None when unreadable). pages: [{"path","h1s","paras"}].
    city: the business's city from its own structured data, or None. sitemap_dates: [datetime] from <lastmod>."""
    out = []
    if robots is None:
        out.append(_nm(G_AI, "AI assistants are allowed in", "The robots file could not be read."))
    else:
        b = blocked_ai_bots(robots)
        if b:
            out.append(_chk(G_AI, "AI assistants are allowed in", "fail" if len(b) >= 3 else "warn",
                            "%d of %d major AI assistants are told to stay out of the whole site." % (len(b), len(AI_BOTS)),
                            why="An assistant that is turned away cannot read the site, so it cannot recommend it.",
                            fix="Remove the Disallow: / lines for these assistants from the robots file.", owner="Turned away: %s." % ", ".join(b), count=len(b)))
        else:
            out.append(_chk(G_AI, "AI assistants are allowed in", "pass", "None of the %d major AI assistants is turned away." % len(AI_BOTS)))
    # An article or one question's own page (/blog/x, /faq/x), never an index page: an FAQ index lists many questions.
    content = [p for p in pages if CONTENT_PATH.search(p.get("path") or "") and (p.get("path") or "").rstrip("/").count("/") >= 2]
    if not content:
        out.append(_nm(G_AI, "Articles open with the question and the city", "No article or question pages were among the pages read."))
    else:
        # `city` is one name or every place the business says it serves.
        #
        # One name was wrong for anybody working across more than one town, and
        # a local business usually is. A site serving fifteen towns writes a
        # page per town, and requiring the head-office city in all of them
        # marked the CORRECT pages as faults:
        #
        #   "What to Bring to a Listing Consultation in Martinez"
        #   "Why Online Home Estimates Miss So Badly in Antioch"
        #
        # Those are exactly right for the question an assistant is answering,
        # and the only way to pass was to put the wrong town in the title. On
        # one audited site this counted 39 of 132 articles where 77 named a
        # town the business actually serves.
        places = [city] if isinstance(city, str) else list(city or [])
        places = [x for x in places if isinstance(x, str) and x.strip()]
        good = 0
        for p in content:
            opening = (p.get("h1s") or [""])[0] if p.get("h1s") else ((p.get("paras") or [""])[0])
            low = opening.lower()
            if opens_with_question(opening) and (not places or any(x.lower() in low for x in places)):
                good += 1
        what = "the question and the city" if places else "the question"
        out.append(_chk(G_AI, "Articles open with the question and the city", "pass" if good == len(content) else "warn",
                        "%d of %d article or question pages open with %s." % (good, len(content), what),
                        why="AI assistants lift the first lines of a page that answers a question; a page that opens on something else is skipped.",
                        fix="Make each page's title the exact question, with the city in it.", count=len(content) - good))
    if not sitemap_dates:
        out.append(_nm(G_AI, "Sitemap shows recent changes", "The sitemap gave no change dates."))
    else:
        newest = max(sitemap_dates)
        age = (now - newest).days
        if age > SITEMAP_MAX_AGE:
            out.append(_chk(G_AI, "Sitemap shows recent changes", "warn", "The newest change in the sitemap is more than %d days old." % SITEMAP_MAX_AGE,
                            why="Search engines and AI assistants return less often to a site that stopped changing.",
                            fix="Publish or update a page, and make sure the sitemap's dates follow.", owner="Newest change: %s." % newest.date()))
        else:
            out.append(_chk(G_AI, "Sitemap shows recent changes", "pass", "The sitemap shows a change in the last %d days." % SITEMAP_MAX_AGE))
    return out


# ---- Looked after (neglect) -------------------------------------------------------------------
def copyright_year(text):
    ys = []
    for m in re.finditer(r"(?:©|&copy;|\(c\)|copyright)\s*(?:\(c\)\s*)?(20\d\d)(?:\s*[-–—]\s*(20\d\d))?", text or "", re.I):
        ys.append(int(m.group(2) or m.group(1)))
    return max(ys) if ys else None


def post_dates(raw, now):
    """Publication dates a page states: JSON-LD datePublished, <time datetime>, article:published_time."""
    found = []
    for pat in (r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})', r"<time\b[^>]{0,200}datetime\s*=\s*[\"'](\d{4}-\d{2}-\d{2})",
                r"article:published_time[\"'][^>]{0,100}content\s*=\s*[\"'](\d{4}-\d{2}-\d{2})",
                r"content\s*=\s*[\"'](\d{4}-\d{2}-\d{2})[^>]{0,100}article:published_time"):
        for s in re.findall(pat, raw or "", re.I):
            try:
                d = datetime.strptime(s, "%Y-%m-%d")
            except ValueError:
                continue
            if d <= now + timedelta(days=2):
                found.append(d)
    return found


def care_checks(home_text, dates, outside_scripts, outside_bytes, now):
    """home_text: the home page's visible text. dates: publication dates found. outside_scripts: addresses
    of scripts loaded from other sites. outside_bytes: summed size of those (None = not all sizes known)."""
    out = []
    y = copyright_year(home_text)
    if y is None:
        out.append(_nm(G_CARE, "Copyright year is current", "The home page shows no copyright year."))
    elif y < now.year - 1:
        out.append(_chk(G_CARE, "Copyright year is current", "warn", "The copyright year on the home page is older than last year.",
                        why="A visitor reads an old year as a business that stopped looking after its site.", fix="Update the year in the footer, or make it fill in by itself.",
                        owner="It says %d." % y))
    else:
        out.append(_chk(G_CARE, "Copyright year is current", "pass", "The copyright year is current."))
    if not dates:
        out.append(_nm(G_CARE, "Something new was posted this year", "No post dates could be found on the pages read."))
    else:
        newest = max(dates)
        if (now - newest).days > POST_MAX_AGE:
            out.append(_chk(G_CARE, "Something new was posted this year", "warn", "The newest post found is more than a year old.",
                            why="Search engines and AI assistants favor sites that keep adding.", fix="Publish a new post.", owner="Newest post: %s." % newest.date()))
        else:
            out.append(_chk(G_CARE, "Something new was posted this year", "pass", "Something new was posted in the last year."))
    n = len(outside_scripts)
    mb = ("%.1f MB" % (outside_bytes / 1_000_000)) if outside_bytes is not None else "an unknown weight"
    if n > OUTSIDE_SCRIPTS_MAX:
        out.append(_chk(G_CARE, "Few outside scripts", "warn", "The home page loads %d scripts from other companies (%s)." % (n, mb),
                        why="Each outside script slows the page, can break it, and can be a way in if that company is compromised.",
                        fix="Remove the scripts nothing needs.", count=n))
    else:
        out.append(_chk(G_CARE, "Few outside scripts", "pass", "The home page loads %d script%s from other companies (%s)." % (n, "" if n == 1 else "s", mb)))
    return out


# ---- Who are you? ------------------------------------------------------------------------------
WHO = {"real-estate-agent": "real-estate", "agent": "real-estate", "lender": "lender", "mortgage": "lender",
       "coach": "general", "consultant": "general", "coach-consultant": "general", "expert": "general",
       "local-service": None, "local-service-business": None}
WHO_LABEL = {"real-estate-agent": "a real estate agent", "lender": "a lender", "coach-consultant": "a coach or consultant",
             "local-service": "a local service business"}


def trade_for(who):
    """('chosen industry' or None for 'detect among the service trades', label). Raises KeyError for an unknown choice."""
    key = (who or "").strip().lower().replace(" ", "-")
    if key in ("", "auto"):
        return "auto", None
    if key not in WHO:
        raise KeyError(who)
    canon = {"agent": "real-estate-agent", "mortgage": "lender", "coach": "coach-consultant", "consultant": "coach-consultant",
             "expert": "coach-consultant", "local-service-business": "local-service"}.get(key, key)
    return WHO[key], WHO_LABEL.get(canon, canon)


# ---- Public report vs owner copy ---------------------------------------------------------------
def _names_re():
    names = {n for n, _ in BUILDERS} | {a["label"] for a in PLUGIN_ADVISORIES}
    return re.compile(r"\b(%s)\b(?:\s+v?\d+(?:\.\d+)*)?" % "|".join(sorted((re.escape(n) for n in names), key=len, reverse=True)))


BUILDER_NAMES = _names_re()
VERSION_RE = re.compile(r"\b\d+\.\d+\.\d+\b")


def _scrub(s):
    s = BUILDER_NAMES.sub("a site builder plugin", str(s))
    s = VERSION_RE.sub("a version", s)
    return s[:1].upper() + s[1:] if s.startswith("a site builder") else s


# Sentences that tell a reader what to do or what a rule requires, wherever an older check wrote one into a detail.
# What-not-how: the report says what was found. A sentence like these is dropped from the detail of a public or owner view.
_GUIDANCE = re.compile(r"(?i)\b(is for your host to confirm|the host has to confirm|ask (the|your) host|look at the phone picture|"
                       r"must|should|describe (loans|the property)|never who)\b")


def _facts_only(detail):
    if not isinstance(detail, str) or not _GUIDANCE.search(detail):
        return detail
    kept = [x for x in re.split(r"(?<=[.!?;:])\s+", detail) if not _GUIDANCE.search(x)]
    return " ".join(kept) if kept else "Not measured from the outside."


def public_view(rep, owner=False):
    """What a stranger may be shown: what is wrong, never how to fix it (rule ranker-what-not-how.md).
    Every fix line goes; the PHP check and plugin checks are said in categories and counts; exact plugin
    and theme names and versions (and the ownership facts) remain only when owner=True, the report
    emailed to the site's owner. Returns a new dict."""
    import copy
    r = copy.deepcopy(rep)
    for c in r.get("checks", []):
        c["fix"] = ""
        # The "why" of an older check (trade rules, Lighthouse items) is written as guidance; only the explanations written
        # for the trust areas and the software section are facts about cost, and those stay.
        if not (c.get("group") or "").startswith(tuple(TRUST_GROUPS) + ("Security of the software",)):
            c["why"] = ""
        c["detail"] = _facts_only(c.get("detail"))
        if owner:
            if c.get("owner"):
                c["detail"] = ("%s %s" % (c["detail"], c["owner"])).strip()
            c.pop("owner", None)
            continue
        c.pop("owner", None)
        n = c.get("name", "")
        if n.startswith("PHP is up to date"):
            c["detail"] = ("The site shows a PHP version that is missing the 21 Oct 2026 security fix." if c["status"] == "fail"
                           else "The site shows a PHP version; the host has to confirm it has the 21 Oct 2026 security fix.")
        elif n.startswith("No known attacked flaw in "):
            c["why"] = "Site builders and plugins run inside your website: a flaw in one is a flaw in your site."
            c["name"] = "No known attacked flaw in a site builder plugin"
            c["detail"] = ("A site builder plugin on the site has a published, critical security flaw that is being attacked." if c["status"] == "fail"
                           else "A site builder plugin on the site has a published, critical security flaw; the page showed no sign the flaw is reachable." if c["status"] == "warn"
                           else "The site builder plugin on the site includes the fix for a published, critical flaw.")
        if BUILDER_NAMES.search(n) and n.endswith("'s version"):  # the "could not tell the version" row
            c["name"] = "A site builder plugin's version"
            c["detail"] = "The site hides its version, so we could not tell whether it has the fix for a published, critical flaw."
        for k in ("detail", "name", "why"):
            if isinstance(c.get(k), str):
                c[k] = _scrub(c[k])
    if not owner:
        p = r.get("platform") or {}
        if p.get("builders"):
            p["builders"] = []
            p["line"] = _scrub(re.sub(r" with [^,.]*", "", p.get("line", "")))
        p["phpVersion"] = None
        for f in r.get("redFlags", []):
            for k in ("title", "detail", "line"):
                if isinstance(f.get(k), str):
                    f[k] = _scrub(f[k])
            if f.get("check"):
                f["check"] = _scrub(f["check"])
        r.get("facts", {}).pop("ownership", None)
    r["publicReport"] = not owner
    r["ownerReport"] = bool(owner)
    return r
