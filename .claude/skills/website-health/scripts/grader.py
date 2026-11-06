#!/usr/bin/env python3
"""
The website health check: audit any website the way our launch gate does.

Run it through audit.py (which also draws the visual report). This module is the
checks; `audit(url, label, industry, state, local)` returns one report dict.

ORIGIN
  Ported from summit-ai-preview/scripts/grade_site.py (2026-10-14), which ported the
  realtor-site-seed launch gate. Added here: the trade packs from the two service
  seeds (packs.py), industry and state detection, plain-words fixes, and honest
  handling of sites that block checkers, need JavaScript to show any words, or
  have a broken security certificate.

THIS IS THE SEED'S PROCESS, PORTED
  realtor-site-seed will not let a site launch until it passes `npm run gate`:
  smoke, validate:schema, launch:check, audit:browser, then audit:compare against
  the owner's old site. This file runs every one of those checks that can be run
  against a live site from the outside, with the same rules and the same floors,
  on standard-library Python 3.9 plus Lighthouse. The checks and their sources:

    Lighthouse floors              audit-compare.mjs   perf 85, a11y 100, best practices 95, SEO 100
    Lighthouse accessibility rules  audit-browser.mjs   axe-core: contrast, alt text, labels, tap targets
    Structured data                validate-schema.mjs JSON-LD on every page, parses, @type, @id refs resolve
    Head, links, scrub, disclosure launch-check.mjs    canonical, share preview, filler, placeholders,
                                                       Fair Housing, commission wording, em-dash/slop,
                                                       license + brokerage + Equal Housing on every page,
                                                       FAQ schema matches the page, duplicate pages, privacy
    Claims                         check-article.mjs   FTC: "#1", "best in town", "guaranteed"...

  Some of the seed's checks need a full scripted browser: dark-mode contrast,
  overlapping text, keyboard focus rings, real-visitor speed. Those are listed as
  NOT MEASURED, never as passed. Silence must never read as success.

  Fair Housing, licence and Equal Housing checks run only for real estate; fair
  lending, NMLS, Equal Housing Lender and Regulation Z claims only for lenders; the
  dental, contractor, pest, auto and salon rules only for those trades, and their
  state rules only in states whose rules were verified. Fair Housing does not apply
  to a plumber.

POLITE BY DESIGN
  This may be somebody's live website. Read-only, one request at a time, a pause
  between pages, at most MAX_PAGES pages and MAX_LINKS link checks.

--local
  For the new preview site on this computer. HTTPS and "can Google crawl it"
  cannot pass on a site that is not published, so they are marked "after launch"
  rather than failed: the seed's audit:compare does the same.

Runs on the Python that ships with macOS (3.9): no newer syntax.
"""
from __future__ import annotations

import codecs
import gzip
import http.client
import html as htmllib
import json
import os
import re
import shutil
import socket
import ssl
import subprocess
import sys
import tempfile
import threading
import time
import zlib
from datetime import datetime
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse, urldefrag, quote
from urllib.request import (HTTPDefaultErrorHandler, HTTPErrorProcessor, HTTPHandler, HTTPRedirectHandler,
                            HTTPSHandler, OpenerDirector, ProxyHandler, Request, urlopen)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import packs  # noqa: E402
import security  # noqa: E402

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 WebsiteHealthCheck"
MAX_PAGES = 25
MAX_LINKS = 60
PAUSE = 0.35
TIMEOUT = 20
# Seconds an audit may spend reading pages and following links. None everywhere a person runs it;
# a front door with a hard time limit (the web checker) sets it, so a slow site is read in part,
# said out loud, instead of the whole check timing out. The page and link caps are the same
# everywhere, so every version reads the same site the same way.
CRAWL_SECONDS = None
LIGHTHOUSE = "lighthouse@12.8.2"

# The launch-gate floors from realtor-site-seed/scripts/audit-compare.mjs:337.
BAR = {"performance": 85, "accessibility": 100, "bestPractices": 95, "seo": 100}

# ------------------------------------------------------------- the seed's lists
# launch-check.mjs:57-77, verbatim.
FILLER = ["placehold.co", "placeholder", "lorem ipsum", "[scaffold", "has not been written yet",
          "example.com", ".example", "@example", "yourdomain", "fill in your", "test-000000",
          "(555)", "555-01", "n/a", "tbd", "todo"]
BRACKET = re.compile(r"\[[A-Z][^\]\n]{0,300}\]")  # launch-check.mjs:82, widened to match build_site's 300-character blanks

# launch-check.mjs:1122-1131 (FAIL) and 1161-1165 (WARN), verbatim.
PLACE = r"(neighbou?rhoods?|communit(?:y|ies)|areas?|part of town|streets?|subdivisions?|zip codes?)"
FH_FAIL = [
    (r"\b(perfect|great|ideal|wonderful) for (a )?(young )?famil(y|ies)\b", "familial status: describe the property, not who it suits"),
    (r"\bfamily[- ]friendly\b", "familial status"),
    (r"\bfamily " + PLACE + r"\b", "familial status"),
    (r"\b(kid|child|children)[- ]friendly\b", "familial status"),
    (r"\b(raise|raising) (your |a )?(kids|children|family)\b", "familial status"),
    (r"\bsafe " + PLACE + r"\b", "'safe' reads as coded language about residents; cite facts instead"),
    (r"\b" + PLACE + r"\W+(?:\w+\W+){0,4}(?:very |really |so )?safe\b", "'safe' reads as coded language about residents; cite facts instead"),
    (r"\b(low|no|high) crime\b", "crime claims steer; leave them to official sources"),
    (r"\bexclusive " + PLACE + r"\b", "exclusionary framing"),
    (r"\b(no children|adults only|no kids)\b", "familial status: unlawful outside qualified 55+ housing"),
    (r"\b(perfect|great|ideal) for (retirees|empty[- ]nesters|seniors|singles|couples|newlyweds)\b", "describe the home, not who should live there"),
    (r"\bbachelor pad\b", "sex/marital framing"),
    (r"\bwalking distance to (a )?(church|churches|synagogue|mosque|temple)\b", "religion: name amenities generically"),
    (r"\b(christian|catholic|jewish|muslim|hindu|mormon)( families| community| neighbou?rhoods?| area)\b", "religion"),
    (r"\bideal for young professionals\b", "describe the home, not the people"),
]
FH_WARN = [
    (r"\b(good|great|best|top|top[- ]rated|excellent) (schools|school districts?)\b", "school-quality claims can steer; name the schools or district factually"),
    (r"\b(quiet|established|desirable) " + PLACE + r"\b", "can read as coded; prefer concrete detail"),
    (r"\bhandicapped\b", "use 'accessible' or person-first language"),
    # From the Summit VIP portal's grader (added there 2026-10-19, merged here 2026-10-26 so both
    # read the same rules): a stage test carried a student's own story ("the house they raised
    # their kids in", "a widow in Land Park") onto the site untouched. People's family or marital
    # status, even a past client's, is not for an ad.
    (r"\b(raised|raising|raise) (their |his |her |our |your |my |the )?(kids|children|family|families)\b", "familial status: tell the story without who lived there"),
    (r"\b(young|growing|new) famil(y|ies)\b", "familial status"),
    (r"\b(widow|widowed|widower|divorcee|divorced|newlyweds?|empty[- ]nesters?|single (mom|mother|dad|father|parents?))\b", "marital or familial status: describe the situation, not the person"),
]
COMMISSION = [
    (r"\b(standard|customary|typical|usual|going)\s+(commission|rate|fee)s?\b", "implies fees are set rather than negotiated"),
    (r"\bcommissions?\s+(are|is)\s+(set|fixed|standard|customary)\b", "antitrust risk"),
    (r"\b6\s*%\s*commission\b", "never state a rate as if it were the norm"),
]
# check-article.mjs:36-48 (FTC), widened after a break-it run slipped past the originals.
CLAIMS = [
    (r"(#\s?1\b|\bnumber[- ]one\b|\bno\.\s?1\b)", "'#1' needs a source the reader can check"),
    (r"\b(top[- ]rated|award[- ]winning|best[- ]selling)\b", "rating or award claim needs the source named"),
    (r"\bbest (\w+ )?(agent|realtor|broker|team|company|firm|business|dentist|doctor|lawyer|attorney|coach|plumber|contractor|choice|option|service|\w+(?:er|or|ist))s? (in|of) [A-Z][a-z]+", "superlative claim"),
    (r"\bbest (in|of) (town|the city|the area|the state|the county)\b", "superlative claim"),
    (r"\b(voted|rated|awarded) (the )?(best|top|#\s?1)\b", "award claim needs the award named"),
    # "deemed reliable but not guaranteed" is the MLS disclaimer, not a claim.
    (r"(?<!not )(?<!no )(?<!never )\bguarantee(d|s)?\b(?! (of|or) (accuracy|completeness))", "a guarantee is a legal promise"),
    (r"\b(results|success) (promised|assured)\b|\bpromise (you )?(results|a sale|to sell)\b", "a promised result is a guarantee"),
    (r"\b100% (satisfaction|success|guaranteed|effective)\b", "absolute claim"),
    # "cheapest" needs something it is cheapest AT. Alone it is ordinary English
    # and fired on writing that makes no price claim at all:
    #   "the cheapest hour of the whole sale"   "timing is often the cheapest one"
    #   "most listings fail there because it is the cheapest to skip"
    # The other three alternatives already name a noun, which is why only this
    # one needed it. A real claim still reads "the cheapest agent in town".
    (r"\b(cheapest\s+(\w+\s+){0,2}(price|rate|fee|commission|cost|agent|realtor|broker|team|service|option|deal|quote|offer|plan)s?"
     r"|lowest price(d)?|lowest rates?|unbeatable price)\b", "price superlative"),
    (r"\brisk[- ]free\b", "absolute claim"),
    (r"\b(always|never) (sells|closes|works|succeeds)\b", "absolute claim"),
]

# ── Saying a word is not making a claim ──────────────────────────────────────
# A site that writes honest FAQ content keeps tripping the guarantee rule, and
# every hit is the opposite of a promise:
#
#   "Will upgrades guarantee a higher sale price?"  -> "Nothing is guaranteed, but..."
#   "Will offering more money guarantee I win?"     -> "No. Sellers look at..."
#   "You are not asking for a guarantee. You are asking whether there is a process."
#
# The three fixed lookbehinds on the rule above only see the word immediately
# before, so "not guaranteed" is excused while "Nothing is guaranteed" is not,
# and a question is treated as an assertion. Good writing was being graded as a
# legal promise, and the only way to pass was to write worse.
#
# Two things excuse a mention, both checked INSIDE the sentence it sits in:
#   - it is negated somewhere earlier in that sentence
#   - it sits in a question, and the text just after answers in the negative
#
# Deliberately NOT applied to the other rules. "We are not the cheapest, we are
# the best agent in Springfield" would be excused by a sentence-wide negation
# test, and that is a superlative claim however it is introduced. The guarantee
# rule is the one where the ordinary, honest way to write the sentence contains
# the trigger word.
NEGATABLE = {"a guarantee is a legal promise"}
_NEG = re.compile(r"\b(no|not|never|nothing|none|cannot|can't|without|isn't|aren't|doesn't|don't)\b", re.I)
_SENTENCE_END = re.compile(r"[.!?]")


def honest_mention(text, start, end):
    """Is this match a denial or a question rather than a promise?"""
    # Back to the start of the sentence, capped so one unpunctuated blob of
    # text cannot excuse a claim thousands of characters later.
    left = max(0, start - 300)
    bound = max((m.end() for m in _SENTENCE_END.finditer(text, left, start)), default=left)
    if _NEG.search(text[bound:start]):
        return True
    # A question is not an assertion, but only when something answers it: an
    # unanswered "Looking for the #1 agent in town?" is still marketing.
    stop = _SENTENCE_END.search(text, end)
    if stop and stop.group() == "?" and _NEG.search(text[stop.end():stop.end() + 240]):
        return True
    return False
# Content we WRITE only: a competitor's real, permitted reviews are not a finding.
INVENTED = [
    (r"[\"“][^\"”]{20,}[\"”]\s*[-–—]\s*[A-Z][a-z]+(\s[A-Z]\.?)?", "looks like a testimonial: only real ones from their file, used with permission"),
    (r"\b(5|five)[- ]star (review|rating)s?\b|\b\d\.\d (stars?|rating)\b", "a rating needs a real, checkable source from their file"),
]
# launch-check.mjs:1053-1107 SLOP, plus the copywriter's banned phrases.
SLOP = [
    (r"—", "em-dash"),
    (r"\bserves as\b", "'serves as'"),
    (r"\bplays a (vital|key|crucial|pivotal) role\b", "'plays a key role'"),
    (r"\bwhen it comes to\b", "'when it comes to'"),
    (r"\bin today's (market|world|landscape|fast-paced world)\b", "'in today's market'"),
    (r"\b(delve|tapestry|nestled|bustling|seamless|leverage|utilize|cutting-edge|unlock|elevate|synergy|game-changer)\b", "AI-sounding word"),
    (r"\b(let's dive in|at the end of the day|it's important to note|here's the thing)\b", "filler phrase"),
]
TRACKERS = [
    ("Meta pixel", r"connect\.facebook\.net|fbq\(", r"\b(meta|facebook|instagram)\b"),
    ("Google tag", r"googletagmanager\.com|google-analytics\.com|gtag\(", r"\bgoogle\b"),
    ("Microsoft Clarity", r"clarity\.ms", r"\b(clarity|microsoft)\b"),
]
TRACK_WORDS = re.compile(r"\b(track|tracking|pixel|cookie|cookies|analytics|advertis|retarget|measure)", re.I)

BUSINESS = re.compile(
    r"^(LocalBusiness|Organization|Corporation|ProfessionalService)$|"
    r"(Business|Agent|Store|Shop|Service|Practice|Office|Clinic|Agency|Dentist|Physician|Attorney|Restaurant)$", re.I)
RE_TYPES = ["Organization", "WebSite", "RealEstateAgent", "Person"]  # validate-schema.mjs:32-37
# Lending ads (Regulation Z, ECOA, UDAAP): the claims that get a loan officer in trouble.
LENDING = [
    (r"\bguaranteed (approval|loan|to (be )?approved)\b", "approval can never be guaranteed"),
    (r"\bno credit check\b|\bno credit\W+no problem\b|\bbad credit (ok|okay|welcome)\b", "misleading for a mortgage"),
    (r"\beveryone (qualifies|is approved|gets approved)\b", "approval can never be promised"),
    (r"\b(you('re| are)|you've been) (pre-?approved|pre-?qualified)\b", "a pre-approval needs an application"),
    (r"(?<![\d.])\d{1,3}(\.\d{1,3})?\s?(%|percent)\s*(apr|rate|interest|down|fixed)?\b(?=[^.]{0,40}\b(apr|rate|interest|loan|mortgage|down)\b)|\b(apr|rate)s?\s+(of|at|from|starting at|as low as)\s+\d", "a rate or percentage triggers full Regulation Z disclosure"),
    (r"\bpayments?\s+(of|as low as|from|starting at|under)\s+\$?\d|\$\d[\d,]*\s*(/|per)\s*(mo|month)\b", "a payment amount triggers full Regulation Z disclosure"),
    (r"\b(zero|no|0%?)\s+down\b|\blow(est)? rates?\b", "a terms claim that needs the full disclosure"),
]
# Fair lending (ECOA, Fair Housing Act): targeting by a protected class, beyond FH_FAIL.
FAIR_LENDING = [
    (r"\b(under|over)\s+(\d{2})\b(?=[^.]{0,30}\b(buyers?|borrowers?|homeowners?|applicants?)\b)", "age targeting"),
    (r"\byoung (buyers|borrowers|couples|families|professionals)\b", "age or family targeting"),
    (r"\b(buyers?|borrowers?|homeowners?|applicants?|families)\s+(under|over|aged?)\s+\d{2}\b", "age targeting"),
    (r"\b(seniors|retirees) only\b|\b(adults|singles|couples) only\b", "protected-class restriction"),
]

# --------------------------------------------------------------------- fetching
_ctx = ssl.create_default_context()
_insecure = ssl.create_default_context()
_insecure.check_hostname = False
_insecure.verify_mode = ssl.CERT_NONE

# Per audit. cert: None (fine), "bad" (curl and Python both refuse it), "unverified" (no
# curl to ask, so we cannot tell a bad certificate from a Python with no certificate store).
# private_ok: the audited site is itself on this computer or network, so redirects there are fine.
STATE = {"cert": None, "headers": {}, "private_ok": False}
# A front door on a public server sets this False: there, no audit ever treats an address as
# "the audited site is on this computer", whatever a name or a resolver says. private_ok is
# decided once, at the start of an audit, and nothing changes it while the audit runs.
LOCAL_TARGETS_OK = True
# A front door may pin curl (the certificate fallback) to an address it has already vetted:
# pin_address(url) -> the IP text to connect to, or None to refuse the hop. Unset (the skill on
# a computer): curl resolves names itself, and every hop still passes allowed().
pin_address = None
CURL_MAX_HOPS = 8
# Codecs a page may not choose: CPython decodes these in pure Python, in time quadratic in the
# body, so a hostile page could hold a check for minutes. No real site needs them.
_SLOW_CODECS = {"punycode", "idna"}
READ_SECONDS = 30          # the most any one response may take, however slowly it drips
MAX_DECODED = 6_000_000    # a compressed response may not expand past this (gzip bombs)


def _charset(headers, raw):
    m = re.search(r"charset=([\w.-]+)", headers.get("content-type", ""), re.I)
    if not m:
        m = re.search(rb"<meta[^>]{0,200}charset=[\"']?([\w.-]+)", raw[:4096], re.I)
        enc = m.group(1).decode("ascii", "ignore") if m else "utf-8"
    else:
        enc = m.group(1)
    try:
        if codecs.lookup(enc).name in _SLOW_CODECS:
            return "utf-8"
        "".encode(enc)
        b"".decode(enc)
        return enc
    except (LookupError, UnicodeError, ValueError):
        return "utf-8"


def _body(raw, headers):
    # We never ask for compression, but some servers send it anyway. Bounded: a few KB of
    # zeros can claim gigabytes once expanded.
    ce = headers.get("content-encoding", "").lower()
    try:
        if "gzip" in ce or raw[:2] == b"\x1f\x8b":
            raw = zlib.decompressobj(16 + zlib.MAX_WBITS).decompress(raw, MAX_DECODED)
        elif "deflate" in ce:
            raw = zlib.decompressobj(zlib.MAX_WBITS if raw[:1] == b"x" else -zlib.MAX_WBITS).decompress(raw, MAX_DECODED)
    except Exception:
        pass  # a truncated (limit-capped) stream: keep what we have
    try:
        return raw.decode(_charset(headers, raw), "replace")
    except Exception:
        return raw.decode("utf-8", "replace")


def _read(r, limit):
    """Read up to `limit` bytes in at most READ_SECONDS, keeping whatever arrived."""
    buf = b""
    started = time.monotonic()
    try:
        while len(buf) < limit and time.monotonic() - started < READ_SECONDS:
            # read1 returns what has arrived after one receive; read() would wait for the full
            # 64 KB, so a server dripping a byte at a time could hold it forever.
            n = min(65536, limit - len(buf))
            chunk = r.read1(n) if hasattr(r, "read1") else r.read(n)
            if not chunk:
                break
            buf += chunk
    except http.client.IncompleteRead as e:
        buf += e.partial or b""
    except (ValueError, OSError, http.client.HTTPException):
        pass
    return buf


def iri(url):
    """An address as a browser would send it: accented domains in punycode, spaces and accents escaped."""
    try:
        u = urlparse(url)
        host = u.hostname or ""
        try:
            host.encode("ascii")
        except UnicodeEncodeError:
            host = host.encode("idna").decode("ascii")
        netloc = host + (":%d" % u.port if u.port else "")
        if u.username:
            netloc = u.username + "@" + netloc
        return u._replace(netloc=netloc, path=quote(u.path, safe="/%:@!$&'()*+,;=~-._"),
                          query=quote(u.query, safe="=&%/:+,;@!$'()*?~-._")).geturl()
    except Exception:
        return url


def allowlist_header(url):
    """The site owner's allowlist header for this address, or None.

    For a site owner who lets this checker past their own bot shield (for example a
    Cloudflare rule that skips its checks for one secret header). Two variables:
      WH_ALLOWLIST_HEADER  "Header-Name: value"
      WH_ALLOWLIST_HOSTS   the owner's domains, comma-separated; each covers its subdomains
    The header goes ONLY to those hosts, never to any other site, link or redirect
    target: a checker that sent it everywhere would hand the secret to anyone who checks
    a site they run. Unset (a person's own computer): nothing is sent, nothing changes.
    The value is never logged or written into a report. curl (the certificate fallback)
    never gets it, because curl carries custom headers across a redirect to another host.
    This is an owner opening their own door, not a way past anyone else's shield.
    Only over https: never on a plain http:// address, where anyone on the path could read
    it. (_with_allowlist also withholds it from any request whose certificate is not checked.)"""
    raw = os.environ.get("WH_ALLOWLIST_HEADER", "")
    name, sep, value = raw.partition(":")
    name, value = name.strip(), value.strip()
    if not (sep and value and re.match(r"^[A-Za-z0-9-]+$", name)) or re.search(r"[\x00-\x1f\x7f]", value):
        return None
    hosts = [h.strip().lower().strip(".") for h in os.environ.get("WH_ALLOWLIST_HOSTS", "").split(",") if h.strip(" .")]
    try:
        u = urlparse(url)
        host = (u.hostname or "").lower().rstrip(".")
    except ValueError:
        return None
    if u.scheme.lower() != "https":
        return None
    if host and any(host == d or host.endswith("." + d) for d in hosts):
        return name, value
    return None


def _with_allowlist(req, insecure=False):
    """The owner's header, only on a request whose certificate is verified (insecure=False)."""
    hv = None if insecure else allowlist_header(req.full_url)
    if hv:
        # Unredirected: urllib never copies it onto a redirect; _Redirects decides again per hop.
        req.add_unredirected_header(hv[0], hv[1])
    return req


class _Redirects(HTTPRedirectHandler):
    """Follow redirects the way a browser would, but only to web pages: never to ftp: or file:,
    and never into this computer or the local network from a site on the internet."""

    def __init__(self, insecure=False):
        super().__init__()
        self.insecure = bool(insecure)

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        try:
            u = urlparse(newurl)
        except ValueError:
            raise HTTPError(req.full_url, code, "unusable redirect", headers, fp)
        if u.scheme not in ("http", "https") or (is_private_host(newurl) and not STATE["private_ok"]):
            raise HTTPError(req.full_url, code, "redirect refused: %s" % u.scheme, headers, fp)
        new = HTTPRedirectHandler.redirect_request(self, req, fp, code, msg, headers, newurl)
        return _with_allowlist(new, self.insecure) if new is not None else None


_openers = {}


def _open(req, insecure):
    key = bool(insecure)
    if key not in _openers:
        # Only http and https handlers: no ftp:, no file:.
        _openers[key] = OpenerDirector()
        for h in (ProxyHandler(), HTTPHandler(), HTTPSHandler(context=_insecure if key else _ctx), _Redirects(key),
                  HTTPErrorProcessor(), HTTPDefaultErrorHandler()):
            _openers[key].add_handler(h)
    return _openers[key].open(req, timeout=TIMEOUT)


def allowed(url):
    """A web address we may fetch: http(s), and not this computer or the local network unless
    the audited site is there too."""
    try:
        u = urlparse(url)
        return u.scheme in ("http", "https") and bool(u.hostname) and (STATE["private_ok"] or not is_private_host(url))
    except ValueError:
        return False


def fetch(url, method="GET", limit=3_000_000):
    """(status, final_url, text). status 0 = never answered. Headers of the last call in STATE."""
    STATE["headers"] = {}
    url = iri(url)
    if not allowed(url):
        return 0, url, ""
    for attempt in (1, 2):
        try:
            req = _with_allowlist(Request(url, method=method, headers={"User-Agent": UA, "Accept": "text/html,*/*",
                                                                       "Accept-Language": "en-US,en;q=0.8"}),
                                  STATE["cert"])
            with _open(req, STATE["cert"]) as r:
                STATE["headers"] = {k.lower(): v for k, v in r.headers.items()}
                raw = _read(r, limit) if method == "GET" else b""
                return r.status, r.geturl(), _body(raw, STATE["headers"])
        except HTTPError as e:
            STATE["headers"] = {k.lower(): v for k, v in (e.headers or {}).items()}
            if e.code == 429 and attempt == 1:  # asked to slow down: once, politely
                time.sleep(4)
                continue
            body = ""
            if method == "GET" and e.fp is not None:
                try:
                    body = _body(_read(e, 200_000), STATE["headers"])  # bot walls explain themselves here
                except Exception:
                    pass
            return e.code, url, body
        except (URLError, ssl.SSLError, OSError, ValueError, http.client.HTTPException) as e:
            if "CERTIFICATE" in str(e).upper() or isinstance(e, ssl.SSLError) or isinstance(getattr(e, "reason", None), ssl.SSLError):
                return _cert_fallback(url, method, limit)
            return 0, url, ""
        except Exception:
            return 0, url, ""
    return 0, url, ""


def _cert_fallback(url, method, limit):
    """Python refused the certificate. Ask curl, which uses the computer's own trust store."""
    status, final, text, code = _curl(url, method, limit)
    if code == 0 and status:
        return status, final, text
    # curl 60/35/51/58 = certificate problems; 127/None = no curl here.
    STATE["cert"] = "bad" if code in (35, 51, 58, 60) else "unverified"
    try:
        # Certificate not checked: the owner's header is never sent on this request.
        req = _with_allowlist(Request(url, method=method, headers={"User-Agent": UA, "Accept": "text/html,*/*"}), True)
        with _open(req, True) as r:
            STATE["headers"] = {k.lower(): v for k, v in r.headers.items()}
            raw = _read(r, limit) if method == "GET" else b""
            return r.status, r.geturl(), _body(raw, STATE["headers"])
    except HTTPError as e:
        return e.code, url, ""
    except Exception:
        return 0, url, ""


def _curl(url, method, limit=3_000_000):
    """curl, following redirects HERE, one hop at a time, never with curl's own -L: every hop
    must pass allowed() (the same rule urllib's redirects obey), and is pinned to a vetted
    address when the front door pins (pin_address). A hop that is refused ends the chain on
    the redirect itself, exactly as urllib's _Redirects does."""
    status, text, code = 0, "", None
    for _ in range(CURL_MAX_HOPS + 1):
        status, nxt, text, code = _curl_once(url, method, limit)
        if code != 0 or not (300 <= status < 400) or not nxt:
            return status, url, text, code
        nxt = urljoin(url, nxt)
        if not allowed(nxt):
            return status, url, "", code
        url = nxt
    return 0, url, "", code


def _curl_once(url, method, limit):
    if not allowed(url):
        return 0, url, "", None
    # --proto: only web addresses. No --compressed: _body decodes, bounded. No -L: _curl decides.
    args = ["curl", "-s", "--proto", "=http,https", "--max-time", str(TIMEOUT), "-A", UA,
            "-w", "\n__STATUS__%{http_code} %{redirect_url}"]
    if pin_address is not None:
        u = urlparse(url)
        ip = pin_address(url)
        if not ip:
            return 0, url, "", None
        port = u.port or (443 if u.scheme == "https" else 80)
        args += ["--noproxy", "*", "--resolve", "%s:%d:%s" % (u.hostname, port, ("[%s]" % ip) if ":" in ip else ip)]
    if method == "HEAD":
        args.append("-I")
    try:
        p = subprocess.Popen(args + [url], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    except Exception:
        return 0, url, "", None
    out = b""
    try:
        while len(out) < limit + 4096:
            chunk = p.stdout.read(65536)
            if not chunk:
                break
            out += chunk
    finally:
        if p.poll() is None:
            p.kill()
        try:
            p.wait(timeout=TIMEOUT + 5)
        except Exception:
            pass
    text = out.decode("utf-8", "replace")
    m = re.search(r"\n__STATUS__(\d+) (\S*)\s*$", text[-4400:])
    if not m:
        return 0, url, "", p.returncode
    cut = len(text) - 4400 + m.start() if len(text) > 4400 else m.start()
    return int(m.group(1)), m.group(2), text[:cut], p.returncode


BOT_WALL = re.compile(r"cf-chl|challenge-platform|just a moment\.\.\.|attention required|checking your browser|"
                      r"captcha|access denied|request unsuccessful\. incapsula|px-captcha|ddos protection by|"
                      r"verify you are (a )?human|enable javascript and cookies to continue|"
                      r"the request could not be satisfied|you don't have permission to access|"
                      r"request blocked|pardon our interruption|are you a robot|bot protection", re.I)
# Headers only bot shields send: Cloudflare, Kasada, DataDome, PerimeterX, Sucuri, Imperva.
WAF_HEADERS = ("cf-mitigated", "x-kpsdk-ct", "x-datadome", "x-px", "x-sucuri-block", "x-iinfo")
WAF_SERVERS = ("cloudflare", "akamaighost", "ddos-guard", "cloudfront", "sucuri/cloudproxy")


def is_bot_wall(status, text, headers):
    """A security service answered instead of the site. Not the site's content, not a finding."""
    if status >= 400 and (BOT_WALL.search(text[:20000] or "") or any(h in headers for h in WAF_HEADERS)
                          or (status in (403, 429) and headers.get("server", "").lower() in WAF_SERVERS)):
        return True
    if status != 200 or len(text) >= 15000:
        return False
    if re.search(r"cf-chl|challenge-platform|px-captcha|_Incapsula_Resource|sgcaptcha", text):
        return True
    # A tiny page whose title is a shield's, answering 200. Measured 2026-10-26: SiteGround's
    # "Bot Verification" page reached the web checker (a data-center address) for
    # nashvilleroofingco.com and was graded as the site. A real page with that title has words.
    title = re.search(r"<title[^>]*>([^<]{0,120})</title>", text, re.I)
    words = len(re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>|<[^>]+>", " ", text).split())
    return bool(title and SHIELD_TITLE.search(title.group(1)) and words < 80)


SHIELD_TITLE = re.compile(r"bot verification|just a moment|attention required|security check|checking your browser|"
                          r"verifying (that )?you are (a )?human|are you a robot|access denied|ddos-guard|human verification", re.I)


def check_status(url):
    status, _, _ = fetch(url, method="HEAD")
    if status in (0, 403, 405, 501) or status >= 500:  # many servers refuse HEAD
        status, _, text = fetch(url, limit=20000)
        if is_bot_wall(status, text, STATE["headers"]):
            return -1  # the shield answered, not the page: unknown, never "broken"
    return status


# ---------------------------------------------------------------------- parsing


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title, self._in_title, self._title_done, self._svg = "", False, False, 0
        self.meta, self.links, self.canonical = {}, [], ""
        self.h1s, self._in_h1 = [], False
        self.imgs, self.imgs_no_alt = 0, 0
        self.lang, self._skip = "", 0
        self.texts, self.main_texts, self._in_main = [], [], 0
        self.paras, self._in_p = [], False
        self.scripts = []
        self.ld, self._in_ld = [], False   # JSON-LD blocks, read by the parser, never by a regex
        self.attr_texts = []               # placeholder="..." words a visitor sees in a form

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        if a.get("placeholder"):
            self.attr_texts.append(a["placeholder"])
        if tag == "html":
            self.lang = a.get("lang", "")
        elif tag == "svg":
            self._svg += 1
        elif tag == "title":
            # Only the page's own title: the first one, outside any inline SVG icon
            # (icons carry their own <title>, "Facebook", "Chevron Right"...).
            self._in_title = not self._svg and not self._title_done
        elif tag == "meta":
            key = (a.get("name") or a.get("property") or "").lower()
            if key:
                self.meta[key] = a.get("content", "")
        elif tag == "link" and "canonical" in a.get("rel", "").lower():
            self.canonical = a.get("href", "")
        elif tag == "a" and "href" in a:
            self.links.append(a["href"])
        elif tag == "h1":
            self._in_h1 = True
            self.h1s.append("")
        elif tag == "img":
            self.imgs += 1
            if "alt" not in a:
                self.imgs_no_alt += 1
        elif tag in ("script", "style", "noscript"):
            if tag == "script" and a.get("src"):
                self.scripts.append(a["src"])
            if tag == "script" and "ld+json" in a.get("type", "").lower():
                self._in_ld = True
                self.ld.append("")
            self._skip += 1
        elif tag == "main":
            self._in_main += 1
        elif tag == "p":
            self._in_p = True
            self.paras.append("")

    def handle_endtag(self, tag):
        if tag == "title":
            if self._in_title:
                self._title_done = True
            self._in_title = False
        elif tag == "svg" and self._svg:
            self._svg -= 1
        elif tag == "h1":
            self._in_h1 = False
        elif tag in ("script", "style", "noscript") and self._skip:
            self._skip -= 1
            self._in_ld = False
        elif tag == "main" and self._in_main:
            self._in_main -= 1
        elif tag == "p":
            self._in_p = False

    def handle_data(self, data):
        if self._in_ld and self.ld:
            self.ld[-1] += data
            return
        if self._in_title:
            self.title += data
            return
        if self._svg:
            return  # icon labels are not page text
        if self._skip:
            return
        self.texts.append(data)
        if self._in_main:
            self.main_texts.append(data)
        if self._in_h1 and self.h1s:
            self.h1s[-1] += data
        if self._in_p and self.paras:
            self.paras[-1] += data


def norm_space(s):
    return re.sub(r"\s+", " ", s).strip()


def parse_ld(blocks_text):
    """Every JSON-LD block (as the parser found them): (parsed nodes, problems)."""
    nodes, problems = [], []
    for raw in blocks_text:
        try:
            data = json.loads(raw.strip())
        except Exception:
            problems.append("a structured-data block is not valid JSON")
            continue
        blocks = data if isinstance(data, list) else [data]
        for b in blocks:
            if isinstance(b, dict):
                nodes.extend(b.get("@graph") if isinstance(b.get("@graph"), list) else [b])
    return nodes, problems


def walk(obj):
    """Every dict in obj, depth first, in document order. A loop with its own stack, not
    recursion: a deep chain of nested JSON costs one step per node, never nodes x depth."""
    stack = [obj]
    while stack:
        o = stack.pop()
        if isinstance(o, dict):
            yield o
            stack.extend(reversed(list(o.values())))
        elif isinstance(o, list):
            stack.extend(reversed(o))


def node_types(nodes):
    out = set()
    for n in nodes:
        for d in walk(n):
            t = d.get("@type")
            if isinstance(t, str):
                out.add(t)
            elif isinstance(t, list):
                out.update(x for x in t if isinstance(x, str))
    return out


def id_problems(nodes):
    """validate-schema.mjs:67-84: every pure {"@id": ...} reference must be defined on the page."""
    defined, refs = set(), set()
    for n in nodes:
        for d in walk(n):
            if isinstance(d.get("@id"), str):
                if len(d) == 1:
                    refs.add(d["@id"])
                else:
                    defined.add(d["@id"])
    return sorted(refs - defined)


# ----------------------------------------------------------------- discovery
def link_key(url):
    try:
        u = urlparse(url)
    except ValueError:
        return url
    h = u.netloc.lower()
    h = h[4:] if h.startswith("www.") else h
    return h + (u.path.rstrip("/") or "/") + ("?" + u.query if u.query else "")


def same_site(url, host):
    try:
        h = urlparse(url).netloc.lower()
    except ValueError:
        return False
    return h == host or h == "www." + host or "www." + h == host


ASSET = re.compile(r"\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|mp3|webm|ico|xml|txt|css|js)(\?|$)", re.I)


def robots_rules(robots):
    """(blocks every search engine, sitemap lines). Only a 'Disallow: /' in the group for
    User-agent: * counts: blocking GPTBot or AhrefsBot alone is a choice, not a fault."""
    groups, cur, in_agents, sitemaps = [], None, False, []
    for line in robots[:200000].splitlines()[:5000]:
        line = line.split("#", 1)[0].strip()
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        k, v = k.strip().lower(), v.strip()
        if k == "sitemap" and v:
            sitemaps.append(v)
        elif k == "user-agent":
            if not in_agents:
                cur = {"agents": [], "allow_root": False, "disallow_root": False}
                groups.append(cur)
            cur["agents"].append(v.lower())
            in_agents = True
        elif cur is not None and k in ("allow", "disallow"):
            in_agents = False
            if v == "/":
                cur["allow_root" if k == "allow" else "disallow_root"] = True
    star = [g for g in groups if "*" in g["agents"]]
    blocks = any(g["disallow_root"] and not g["allow_root"] for g in star)
    return blocks, sitemaps[:20]


def sitemap_urls(base, host):
    candidates = []
    status, _, robots = fetch(urljoin(base, "/robots.txt"))
    has_robots = status == 200 and "user-agent" in robots[:200000].lower()
    blocks_all, listed = robots_rules(robots) if has_robots else (False, [])
    for c in listed:
        try:
            candidates.append(urljoin(base, c))  # "Sitemap: sitemap.xml" is common and relative
        except ValueError:
            pass
    candidates += [urljoin(base, "/sitemap.xml"), urljoin(base, "/sitemap_index.xml")]
    candidates = [c for c in candidates if allowed(c) and same_site(c, host)]
    found, pages, seen = False, [], set()
    queue = list(dict.fromkeys(candidates))
    while queue and len(seen) < 8 and len(pages) < 500:
        sm = queue.pop(0)
        if sm in seen:
            continue
        seen.add(sm)
        s, _, xml = fetch(sm)
        if s != 200 or "<loc>" not in xml:
            continue
        found = True
        locs = [htmllib.unescape(l.strip()) for l in re.findall(r"<loc>([^<]*)</loc>", xml)]
        if "<sitemapindex" in xml:
            for l in locs:
                try:
                    l = urljoin(sm, l)
                except ValueError:
                    continue
                if l not in seen and allowed(l) and same_site(l, host):
                    queue.append(l)
        else:
            pages += [l for l in locs if same_site(l, host)]
    return has_robots, blocks_all, found, list(dict.fromkeys(pages))


def pick_pages(home, sm_pages, home_links, host):
    pool = list(sm_pages)
    # A sitemap that names almost nothing (wordpress.org's lists only the home page) is not
    # the site: fill in from the home page's own links.
    if len({link_key(p) for p in pool} - {link_key(home)}) < 5:
        for href in home_links:
            try:
                u = urldefrag(urljoin(home, href.strip()))[0]
            except ValueError:
                continue
            if u.startswith("http") and same_site(u, host) and not ASSET.search(u):
                pool.append(u)
    keyed = {}
    for p in pool:
        keyed.setdefault(link_key(p), p)
    pool = [p for k, p in keyed.items() if k != link_key(home)]
    if len(pool) > MAX_PAGES - 1:
        step = len(pool) / (MAX_PAGES - 1)
        pool = [pool[int(i * step)] for i in range(MAX_PAGES - 1)]
    return [home] + pool


def page_words(p):
    return len(re.findall(r"[A-Za-z]{2,}", p["visible"]))


# An empty shell that scripts fill in: few words AND a script-built page (an empty app
# mount point, or a <noscript> asking for JavaScript). A short plain page is just short.
JS_SHELL = re.compile(r"<div[^>]{0,200}\bid=[\"'](?:root|app|__next|__nuxt|svelte|main-app)[\"'][^>]{0,200}>\s{0,200}</div>|"
                      r"<noscript[^>]{0,100}>[^<]{0,300}(?:enable|requires?|need)[^<]{0,50}javascript", re.I)


def is_js_shell(p):
    return page_words(p) < 60 and bool(p["scripts"]) and bool(JS_SHELL.search(p["raw"][:300000]))


# A site that says it is not launched yet: its title or main heading says so, or a short
# page does. Used only to decide why Google's test has no scores (lighthouse_unavailable).
COMING_SOON = re.compile(r"\b(?:coming soon|under construction|launching soon|"
                         r"(?:site|website) (?:is )?(?:currently )?under (?:construction|maintenance)|"
                         r"(?:new )?(?:web)?site (?:is )?coming)\b", re.I)


def looks_unlaunched(title, h1s, text):
    if COMING_SOON.search((title or "") + " " + " ".join(h1s or [])):
        return True
    text = text or ""
    return len(re.findall(r"[A-Za-z]{2,}", text[:20000])) < 150 and bool(COMING_SOON.search(text[:4000]))


# ----------------------------------------------------------------- Lighthouse
A11Y_PLAIN = {
    "color-contrast": "Text too faint to read against its background",
    "image-alt": "Images with no description",
    "link-name": "Links a screen reader cannot name",
    "button-name": "Buttons with no name",
    "label": "Form fields with no label",
    "target-size": "Buttons and links too small to tap",
    "heading-order": "Headings out of order",
    "html-has-lang": "Page language not declared",
    "document-title": "Page has no title",
    "meta-viewport": "Zooming is blocked on phones",
    "frame-title": "Embedded frames with no title",
    "list": "Lists built incorrectly",
    "listitem": "List items outside a list",
    "aria-allowed-attr": "Accessibility labels used incorrectly",
    "aria-hidden-focus": "Hidden things you can still tab to",
    "duplicate-id-aria": "Duplicate accessibility IDs",
    "link-in-text-block": "Links that only stand out by color",
}


A11Y_FIX = {
    "color-contrast": "Darken the text or lighten the background on each one listed until it reads easily.",
    "image-alt": "Add alt text to each image listed: a few words saying what it shows.",
    "link-name": "Give each listed link words a screen reader can say, such as 'Call us' instead of an icon alone.",
    "button-name": "Give each listed button a name a screen reader can say.",
    "label": "Give each listed form field a visible label.",
    "target-size": "Make each listed button or link at least 24 pixels tall and wide, with space around it.",
    "heading-order": "Use headings in order (H1, then H2, then H3) without skipping levels.",
    "html-has-lang": "Set the page language (lang=\"en\").",
    "document-title": "Give the page a title.",
    "meta-viewport": "Remove 'user-scalable=no' or 'maximum-scale' from the viewport tag so people can zoom.",
    "frame-title": "Give each embedded map or video a title.",
    "list": "Put list items directly inside a list.",
    "listitem": "Put list items directly inside a list.",
    "link-in-text-block": "Underline links inside paragraphs so they do not rely on color alone.",
}


def find_node():
    """Our private Node first (get_node.py), then Summit's, then whatever is on PATH."""
    cands = []
    for d in (".website-health", ".ai-preview"):  # .ai-preview: where the Summit VIP portal installs Node
        home = os.path.join(os.path.expanduser("~"), d, "node")
        cands += [os.path.join(home, "bin", "node"), os.path.join(home, "node.exe")]
    cands.append(shutil.which("node"))
    for cand in cands:
        if cand and os.path.exists(cand) and os.path.exists(
                os.path.join(os.path.dirname(cand), "npx.cmd" if os.name == "nt" else "npx")):
            return cand
    return None


# A SECURITY CHECK PAGE IS NOT THE SITE (owner decision, 2026-10-19). Lighthouse scores whatever
# page loads. Behind a bot shield it can load the shield's "Just a moment..." page instead of the
# site and hand back confident numbers for it: themashoregroup.com showed 83 / 93 / 71 / 45 from our
# server, and Lighthouse on Cloudflare's own check page scores 100 / 93 / 93 / 50, while the real
# site scores SEO 100 (the check page is marked noindex). So every
# Lighthouse result is checked before its scores are read, and a challenge page's scores are thrown
# away, never shown. Evidence, from the result alone (it works for the skill's local Chrome, the web
# checker's Chromium and PageSpeed alike):
#   1. each vendor's standard challenge or block page, seen in the final address, the requests the
#      page made, or the elements Lighthouse quotes (its largest element, its biggest blocks);
#   2. the main document's HTTP status: an error page is not the site;
#   3. the generic wording ("Just a moment...", "Checking your browser") only together with a
#      noindex page, because a real site's loading screen can say it too.
# Never a marker that ordinary protected pages also carry: Cloudflare's bot script
# (/cdn-cgi/challenge-platform/scripts/jsd/), Turnstile on a contact form (orchestrate/chl_api),
# Imperva's per-page resource (_Incapsula_Resource?SWJIYLWA), DataDome's tag (js.datadome.co).
# Those would throw away real scores.
LH_CHALLENGE_PAGES = (
    ("Cloudflare", re.compile(
        r"/cdn-cgi/challenge-platform/h/\w+/orchestrate/(chl_page|managed|jsch|captcha)/|__cf_chl_\w*tk|cf-browser-verification"
        r"|id=\"challenge-(form|stage|body-text|error-text|running|success)\"|needs to review the security of your connection"
        r"|attention required! ?\| ?cloudflare|verify(ing)? you are human(\. this may take| by completing)"
        r"|performing security verification|uses a security service to protect against malicious bots", re.I)),
    ("Sucuri", re.compile(r"sucuri website firewall|sucuri_cloudproxy|cloudproxy@sucuri", re.I)),
    ("Akamai", re.compile(r"errors\.edgesuite\.net|/_sec/cp_challenge/|sec-if-cpt", re.I)),
    ("Imperva", re.compile(r"incapsula incident id|_incapsula_resource\?cwudnsai|request unsuccessful\. incapsula", re.I)),
    ("DataDome", re.compile(r"(geo|ct)\.captcha-delivery\.com|please enable js and disable any ad blocker", re.I)),
    ("HUMAN (PerimeterX)", re.compile(r"px-captcha|captcha\.px-cd[np]\.net|captcha\.perimeterx\.net", re.I)),
    ("AWS WAF", re.compile(r"\.awswaf\.com/[^\s\"']*challenge|gokuprops", re.I)),
    ("Vercel", re.compile(r"vercel security checkpoint", re.I)),
)
LH_CHALLENGE_WORDS = re.compile(r"just a moment\.\.\.|attention required|checking your browser|cf-chl|challenge-platform|"
                                r"enable javascript and cookies|access denied|pardon our interruption|are you a robot|"
                                r"ddos protection by", re.I)
LH_TEXT_KEYS = ("snippet", "nodeLabel", "url")


def _lh_strings(lh, limit=20000):
    """The page's own words and addresses inside a Lighthouse result: element snippets and labels
    and request URLs from every audit's details, plus the final addresses. Never Lighthouse's own
    audit titles, which are the same on every site."""
    out = [str(lh.get(k) or "") for k in ("mainDocumentUrl", "finalDisplayedUrl", "finalUrl")]
    stack = [(a or {}).get("details") for a in (lh.get("audits") or {}).values()]
    while stack and len(out) < limit:
        o = stack.pop()
        if isinstance(o, dict):
            for k, v in o.items():
                if k in LH_TEXT_KEYS and isinstance(v, str):
                    out.append(v[:2000])
                elif isinstance(v, (dict, list)) and k != "data":
                    stack.append(v)
        elif isinstance(o, list):
            stack.extend(x for x in o if isinstance(x, (dict, list)))
    return out


def lh_main_status(lh):
    """The HTTP status the main document answered Lighthouse with, from its network log, or None."""
    main = lh.get("mainDocumentUrl") or lh.get("finalUrl") or ""
    items = (((lh.get("audits") or {}).get("network-requests") or {}).get("details") or {}).get("items") or []
    for it in items:
        if it.get("url") == main and it.get("resourceType") == "Document" and it.get("statusCode"):
            return int(it["statusCode"])
    return None


def lighthouse_challenge(lh):
    """Who answered instead of the site when Lighthouse graded a security check or error page:
    a vendor name, "a security service" or "an error page". None when it is the real page."""
    if not (lh or {}).get("categories") or all((c or {}).get("score") is None for c in lh["categories"].values()):
        return None  # nothing was scored, so nothing fake can be shown
    text = "\n".join(_lh_strings(lh))
    for vendor, pattern in LH_CHALLENGE_PAGES:
        if pattern.search(text):
            return vendor
    status = lh_main_status(lh)
    if status and status >= 400:
        return "a security service" if status in (401, 403, 429, 503) or LH_CHALLENGE_WORDS.search(text) else "an error page"
    noindex = ((lh.get("audits") or {}).get("is-crawlable") or {}).get("score") == 0
    if noindex and LH_CHALLENGE_WORDS.search(text):
        return "a security service"
    return None


def read_lighthouse(lh, result):
    cats = lh.get("categories", {})
    audits = lh.get("audits", {})
    result.pop("_challenge", None)

    def g(k):
        v = (cats.get(k) or {}).get("score")
        return None if v is None else round(v * 100)

    def failed(cat):
        out = []
        for ref in (cats.get(cat) or {}).get("auditRefs", []):
            a = audits.get(ref.get("id")) or {}
            if a.get("score") is not None and a.get("score") < 1 and a.get("scoreDisplayMode") not in ("informative", "notApplicable", "manual") and ref.get("weight", 0) > 0:
                items = ((a.get("details") or {}).get("items") or [])
                where = []
                for it in items[:4]:
                    node = it.get("node") or {}
                    # The words on the element, never a CSS selector: "div#Wrapper > a.cta" means
                    # nothing to an owner, and the count already says how many there are.
                    label = (node.get("nodeLabel") or "").strip()
                    if label and not re.search(r"[#>]|^[a-z]+[.#\[]|^(div|span|a|section|button)\b", label):
                        where.append(label[:60])
                out.append({"id": a.get("id"), "title": A11Y_PLAIN.get(a.get("id"), a.get("title")), "count": len(items), "where": where})
        return out

    # Lighthouse's own verdict when the page itself would not load (NO_FCP, PAGE_HUNG,
    # ERRORED_DOCUMENT_REQUEST with the status the page answered, ...): the evidence
    # lighthouse_unavailable() weighs against our own plain read of the page.
    rt = lh.get("runtimeError") or {}
    rt_msg = str(rt.get("message") or "")
    doc = re.search(r"Status code: (\d{3})", rt_msg)
    result.update({
        "_runtimeCode": str(rt.get("code") or "").upper() or None, "_runtimeMsg": rt_msg or None,
        "_docStatus": int(doc.group(1)) if doc else None,
    })
    result.update({
        "performance": g("performance"), "accessibility": g("accessibility"),
        "bestPractices": g("best-practices"), "seo": g("seo"),
        "lcp": (audits.get("largest-contentful-paint") or {}).get("displayValue"),
        "cls": (audits.get("cumulative-layout-shift") or {}).get("displayValue"),
        "a11yFailed": failed("accessibility"), "seoFailed": failed("seo"),
        # What the phone actually showed: a picture is worth the whole report card.
        "screenshot": ((audits.get("final-screenshot") or {}).get("details") or {}).get("data"),
        "bpFailed": failed("best-practices"),
        # Why speed has no score when the other three do (the page never painted a measurable
        # main picture or headline, or Chrome hit an error on it).
        "_perfWhy": ((audits.get("largest-contentful-paint") or {}).get("errorMessage")
                     or (lh.get("runtimeError") or {}).get("message") or ""),
    })
    challenge = lighthouse_challenge(lh)
    if challenge:
        # Never show the scores, the screenshot or the findings of a security check page: they
        # grade the shield, not the site. lighthouse_unavailable() then says why (cause "blocked").
        for k in LH_SCORES + ("lcp", "cls", "screenshot"):
            result[k] = None
        result.update({"a11yFailed": [], "seoFailed": [], "bpFailed": [], "_perfWhy": ""})
        if challenge == "an error page":
            # Scored anyway, but the page answered with an error: weigh it like Lighthouse's own
            # ERRORED_DOCUMENT_REQUEST (the decision table in lighthouse_unavailable).
            st = lh_main_status(lh)
            result.update({"_runtimeCode": "ERRORED_DOCUMENT_REQUEST", "_docStatus": st,
                           "_runtimeMsg": "The page answered Google's test with error %s." % st,
                           "_error": "Google's test was shown an error page (status %s) instead of the site" % st})
        else:
            result.update({"_challenge": challenge,
                           "_error": "Google's test was shown a security check page (%s) instead of the site" % challenge})
        return
    if rt_msg and all(result.get(k) is None for k in LH_SCORES):
        result["_error"] = "Google's test reported: %s" % rt_msg[:240]


def lighthouse_local(url, result):
    # Lighthouse starts Chrome itself. Measured on GitHub's machines, 2026-10-14: works on
    # both Mac chips and Linux in 24-57 s. Starting Chrome ourselves and attaching made it
    # hang on every platform, so that was removed. Windows works too (Chrome, 100 on
    # example.com); the "cannot connect to Chrome" failures seen in CI came from the test
    # moving the home folder, which a real computer never does.
    # A cold Chrome on Windows sometimes loses the race to its debugging port ("Unable to
    # connect to Chrome", 1 run in 6 on GitHub's Windows machines). That fails in seconds and
    # the next start is warm, so try up to three times. Anything else is not retried.
    for attempt in range(3):
        result.pop("_error", None)
        if _lighthouse_once(url, result):
            return True
        if "connect to Chrome" not in result.get("_error", "") and "debugging port" not in result.get("_error", ""):
            return False
    return False


# Chrome's sandbox stays on unless it cannot work: Linux as root (containers, CI). The audited
# page is someone else's code; on a person's own computer it runs sandboxed.
NO_SANDBOX = sys.platform.startswith("linux") and hasattr(os, "geteuid") and os.geteuid() == 0


def find_browser():
    """Chrome first, then Edge (on every Windows PC), then Chromium. None when there is none."""
    if os.environ.get("CHROME_PATH") and os.path.exists(os.environ["CHROME_PATH"]):
        return os.environ["CHROME_PATH"]
    home = os.path.expanduser("~")
    if sys.platform == "darwin":
        names = ["Google Chrome.app/Contents/MacOS/Google Chrome", "Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
                 "Chromium.app/Contents/MacOS/Chromium"]
        cands = [os.path.join(root, n) for n in names for root in ("/Applications", os.path.join(home, "Applications"))]
    elif os.name == "nt":
        roots = [os.environ.get(k, "") for k in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA")]
        cands = [os.path.join(r, n) for n in ("Google\\Chrome\\Application\\chrome.exe", "Microsoft\\Edge\\Application\\msedge.exe")
                 for r in roots if r]
    else:
        cands = [shutil.which(n) for n in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge")]
    return next((c for c in cands if c and os.path.exists(c)), None)


def _npx_cli(node):
    """npm's own npx script beside this node. Running it with node directly keeps Windows'
    cmd.exe (which npx.cmd needs) away from the address: an & or | in a URL is then just text."""
    d = os.path.dirname(node)
    for c in (os.path.join(d, "node_modules", "npm", "bin", "npx-cli.js"),
              os.path.join(d, "..", "lib", "node_modules", "npm", "bin", "npx-cli.js")):
        if os.path.exists(c):
            return os.path.abspath(c)
    return None


def _lighthouse_once(url, result):
    for k in ("_noBrowser", "_timeout"):
        result.pop(k, None)
    node = find_node()
    if not node:
        result["_error"] = "Node is not installed here"
        return False
    bindir = os.path.dirname(node)
    npx = os.path.join(bindir, "npx.cmd" if os.name == "nt" else "npx")
    out = os.path.join(tempfile.mkdtemp(), "lh.json")
    env = dict(os.environ, PATH=bindir + os.pathsep + os.environ.get("PATH", ""))
    # A fixed free port: without one, chrome-launcher finds Chrome's port by reading Chrome's
    # log file, which fails on Windows ("waiting for dynamic debugging port").
    with socket.socket() as sk:
        sk.bind(("127.0.0.1", 0))
        port = sk.getsockname()[1]
    browser = find_browser()
    if browser:
        env["CHROME_PATH"] = browser  # Edge on a Windows PC without Chrome
    cli = _npx_cli(node)
    if cli:
        launcher = [node, cli]
    elif os.name == "nt" and re.search(r"[&|<>^\"%!]", url):
        result["_error"] = "This address has characters Windows cannot pass safely to Google's test"
        return False
    else:
        launcher = [npx]
    args = launcher + ["--yes", LIGHTHOUSE, url, "--quiet", "--port=%d" % port, "--chrome-flags=--headless=new" + (" --no-sandbox" if NO_SANDBOX else ""),
            "--only-categories=performance,accessibility,best-practices,seo",
            "--output=json", "--output-path=" + out]
    err = ""
    try:
        p = subprocess.run(args, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True,
                           encoding="utf-8", errors="replace", timeout=200)
        err = (p.stderr or "").strip()
        with open(out, encoding="utf-8") as f:
            lh = json.load(f)
    except Exception as e:
        tail = err.splitlines()[-1][:200] if err else type(e).__name__
        hint = " (no Chrome or Edge found on this computer)" if not browser else ""
        result["_error"] = "Lighthouse could not run here%s: %s" % (hint, tail)
        result["_log"] = "\n".join(err.splitlines()[-40:])  # Lighthouse's own words, for whoever fixes it
        # Evidence for lighthouse_unavailable(): no browser to run it in, or it ran out of time.
        if not browser or re.search(r"No Chrome installations found", err):
            result["_noBrowser"] = True
        if isinstance(e, subprocess.TimeoutExpired):
            result["_timeout"] = True
        return False
    read_lighthouse(lh, result)
    result["_source"] = "Google Lighthouse, run on this computer in %s" % ("Edge" if "edge" in (browser or "").lower() else "Chrome")
    # Any score counts as a run. A page Chrome cannot time still has its accessibility, best
    # practices and SEO measured; asking Google's servers again would not change that.
    return any(result.get(k) is not None for k in ("performance", "accessibility", "bestPractices", "seo"))


def pagespeed(url, result):
    api = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=" + quote(url, safe="") + \
          "".join("&category=" + c for c in ("performance", "accessibility", "best-practices", "seo")) + "&strategy=mobile"
    key = os.environ.get("PAGESPEED_API_KEY", "").strip()
    if key:
        api += "&key=" + key
    for attempt in range(2):
        try:
            with urlopen(Request(api, headers={"User-Agent": UA}), timeout=90, context=_ctx) as r:
                read_lighthouse(json.loads(r.read().decode("utf-8")).get("lighthouseResult", {}), result)
            result["_source"] = "Google Lighthouse, run by Google PageSpeed"
            return
        except HTTPError as e:
            result["_error"] = "PageSpeed answered %s" % e.code
            if e.code == 429 and attempt == 0:
                time.sleep(8)
                continue
            return
        except Exception as e:
            result["_error"] = "PageSpeed did not answer (%s)" % type(e).__name__
            return


WINDOWS_LIMIT = ("Google's speed test can't run on this Windows computer from here (a Windows limit, not a "
                 "problem with your site). Everything else on this report card was checked.")


def is_private_host(url):
    h = (urlparse(url).hostname or "").lower()
    return (h in ("localhost", "::1") or h.endswith(".localhost") or h.endswith(".local") or h.endswith(".test")
            or bool(re.match(r"^(127\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0$)", h)))


# The engine's own name rule, kept even when a front door replaces is_private_host with a
# stricter, resolving check: "is the audited site on this computer" is a question about the
# address the person typed, never about what a DNS answer says at one moment.
_local_by_name = is_private_host


def lighthouse_any(url, result, local_site):
    local_site = local_site or is_private_host(url)
    if lighthouse_local(url, result):
        result.pop("_error", None)
        return
    if local_site:
        # Google's servers cannot reach a site on this computer. On Windows, Google's speed
        # test often cannot start Chrome from a background task: a known Windows limit, not
        # a fault in their site. Say so plainly instead of showing Chrome's error.
        if os.name == "nt":
            result["_log"] = (result.get("_log") or "") + "\n" + (result.get("_error") or "")
            result["_error"] = WINDOWS_LIMIT
            result["_limit"] = "windows"
        return
    local_err = result.get("_error")
    pagespeed(url, result)
    if result.get("performance") is None and local_err:
        result["_error"] = "%s; %s" % (local_err, result.get("_error", ""))


# ------------------------------------------------------------------- the audit
# One plain sentence per check: what to do about it. Shown in the report's "Fix these first".
FIX = {
    "Speed": "Compress and resize the big photos, and remove apps or widgets the site no longer uses.",
    "Accessibility": "Work through the accessibility items listed below; each one names what to change.",
    "Best practices": "Ask whoever maintains the site to clear the browser console errors and outdated code Lighthouse lists.",
    "SEO": "Fix the titles, descriptions and links listed below; Lighthouse's SEO score follows.",
    "Secure connection (https)": "Turn on HTTPS with your host (usually one switch) and redirect http to https.",
    "Valid security certificate": "Renew or reinstall the security certificate with your host. Visitors see a full-page warning until you do.",
    "Sitemap": "Turn on the sitemap in your website builder (or an SEO plugin) and submit it in Google Search Console.",
    "Search engines allowed in": "Remove the 'Disallow: /' line from robots.txt, or untick 'discourage search engines' in your builder.",
    "Page titles the right length": "Give each listed page a unique title of 10 to 65 characters that says what the page is and where.",
    "Search descriptions": "Write a 50 to 170 character description for each listed page, in your builder's SEO settings.",
    "Exactly one main heading": "Make sure each page has exactly one H1 heading that says what the page is about.",
    "Canonical address on every page": "Set a canonical URL on every page that points to the page's own full address.",
    "Share preview (title + image)": "Set a social share title and image (Open Graph) for every page.",
    "Works on a phone (viewport)": "Add the standard mobile viewport tag; most modern builders do this for you.",
    "Language declared": "Set the site language (lang=\"en\") in your builder's settings or the page template.",
    "llms.txt for AI assistants": "Publish a short /llms.txt that says who you are, what you do, where, and links to your key pages.",
    "Every image described": "Add alt text to every image: a few words saying what it shows.",
    "Words readable without JavaScript": "Ask your developer to render page text on the server (pre-render), so AI assistants that do not run JavaScript can read it.",
    "On every page": "Add LocalBusiness (or your business type) structured data to every page. Most SEO plugins can do it.",
    "Written correctly (valid JSON)": "Fix the broken structured-data block; paste the page into Google's Rich Results Test to see the error.",
    "Every item says what it is (@type)": "Give every structured-data item a @type.",
    "Every cross-reference resolves (@id)": "Define every @id the structured data points to, on the same page.",
    "Says this is a business": "Add structured data that declares your business type, name, address and phone.",
    "Agent, person, brokerage and website on every page": "Add Organization, WebSite, RealEstateAgent and Person structured data to every page.",
    "Questions marked up for AI answers (FAQ)": "Add a short FAQ to your key pages and mark it up as FAQPage.",
    "FAQ markup matches what is on the page": "Only mark up questions that visitors can actually see on the page.",
    "Pages that load": "Fix or redirect the pages that fail to load.",
    "Links that go somewhere": "Fix or remove the links that lead to missing pages.",
    "Every link opens a real page": "Replace javascript: links with real page links or buttons.",
    "Every page links home": "Make the logo or a 'Home' link go to the home page on every page.",
    "Every page links to contact": "Put a Contact link in the menu or footer of every page.",
    "At least 5 internal links per page": "Link each listed page to at least five other pages on your site.",
    "No leftover template text": "Replace the leftover template text listed (lorem ipsum, example.com, placeholder phone numbers).",
    "Nothing left to fill in": "Fill in the square-bracket blanks with your real details.",
    "No claims you would have to prove (FTC)": "Remove or source each listed claim: name the award, survey or data behind it.",
    "Sounds like a person, not a robot": "Rewrite the listed phrases the way you would say them out loud.",
    "No near-duplicate pages": "Rewrite or merge pages that say nearly the same thing.",
    "Fair Housing language": "Rewrite the listed phrases to describe the property, never who should live there.",
    "Phrases that can read as steering": "Swap the listed phrases for concrete facts: the school names, the year built, the lot size.",
    "Commission wording": "Say commissions are negotiable; never describe a rate as standard.",
    "License number on every page": "Put your license number in the footer so it shows on every page.",
    "Brokerage named on every page": "Put your brokerage's name in the footer so it shows on every page.",
    "Equal Housing Opportunity on every page": "Add the words 'Equal Housing Opportunity' to the footer, not just the logo.",
    "Fair lending language": "Rewrite the listed phrases to describe loans, never who should apply.",
    "Lending claims": "Remove the listed rate, payment or approval claims, or add the full Regulation Z disclosure next to them.",
    "NMLS number on every page": "Put your individual NMLS number in the footer.",
    "Company NMLS number on every page": "Put the company NMLS number in the footer beside yours.",
    "Equal Housing Lender on every page": "Add 'Equal Housing Lender' to the footer.",
    "Privacy policy page": "Publish a privacy policy page and link it from the footer.",
    "Tracking tools disclosed": "Name each tracking tool listed (Meta, Google, Microsoft) in the privacy policy, and what it is used for.",
    "Offers and disclaimers": "Put the conditions of any free offer right beside it, and replace 'results may vary' with the typical result.",
}

US_STATES = {"alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA", "colorado": "CO",
             "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
             "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS", "kentucky": "KY", "louisiana": "LA",
             "maine": "ME", "maryland": "MD", "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
             "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
             "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC",
             "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA",
             "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", "tennessee": "TN", "texas": "TX",
             "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
             "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC"}

# schema.org types that name the trade outright. The site's own markup beats any guess from words.
TYPE_INDUSTRY = {"RealEstateAgent": "real-estate", "Dentist": "dentist", "Orthodontist": "orthodontist", "Plumber": "plumber",
                 "Electrician": "electrician", "RoofingContractor": "roofer", "HVACBusiness": "hvac",
                 "GeneralContractor": "contractor", "HousePainter": "contractor", "AutoRepair": "auto-repair",
                 "HairSalon": "salon", "BeautySalon": "salon", "NailSalon": "salon", "DaySpa": "salon",
                 "MedicalSpa": "medspa", "MortgageLender": "lender", "MortgageBroker": "lender", "PestControl": "pest-control"}
WORD_INDUSTRY = [  # (industry, pattern); 3+ hits in what the site says it is, and clearly ahead of the rest
    ("lender", r"\bNMLS\b|\bloan officers?\b|\bmortgages?\b|\bhome loans?\b|\brefinanc\w*"),
    ("real-estate", r"\brealtors?\b|\breal estate\b|\bhomes? for sale\b|\blisting agent\b|\bDRE\s*#|\bbrokerage\b|\bbuyers and sellers\b"),
    ("orthodontist", r"\borthodont\w+|\bbraces\b|\binvisalign\b|\bclear aligners?\b"),
    ("dentist", r"\bdentist(ry)?\b|\bdental\b|\bDDS\b|\bDMD\b|\bteeth\b"),
    ("plumber", r"\bplumb(er|ers|ing)\b|\bdrain cleaning\b|\bwater heaters?\b|\bsewer\b"),
    ("electrician", r"\belectricians?\b|\belectrical\b|\bpanel upgrades?\b|\brewir\w+"),
    ("roofer", r"\broof(er|ers|ing)?\b|\bshingles?\b|\bgutters?\b"),
    ("hvac", r"\bHVAC\b|\bheating\b|\bcooling\b|\bfurnaces?\b|\bair condition\w+|\bheat pumps?\b"),
    ("landscaper", r"\blandscap\w+|\blawn (care|service|mowing)\b|\bhardscap\w+|\birrigation\b"),
    ("pest-control", r"\bpest control\b|\bpests?\b|\bexterminat\w+|\btermites?\b|\brodents?\b"),
    ("auto-repair", r"\bauto (repair|service|shop)\b|\bmechanics?\b|\bbrakes?\b|\boil changes?\b|\bcar repair\b"),
    ("medspa", r"\bmed ?spa\b|\bmedical spa\b|\bbotox\b|\binjectables?\b|\bdermal fillers?\b|\blaser hair removal\b"),
    ("barber", r"\bbarber\w*|\bfades?\b|\bbeard trims?\b|\bstraight razor\b"),
    ("salon", r"\bhair salon\b|\bsalon\b|\bbalayage\b|\bhaircuts?\b|\bhair colou?r\b|\bblowouts?\b|\bstylists?\b"),
]


# Trades that share one set of rules compete as one family, so a barbershop that also says
# "salon" is not split in two and refused. Unregulated trades compete too: a law firm that
# handles real estate closings must not be read as a real estate agent.
FAMILY = {"dentist": "dental", "orthodontist": "dental", "salon": "beauty", "barber": "beauty", "medspa": "beauty"}
OTHER_TRADES = [
    ("a law firm", r"\battorneys?\b|\blawyers?\b|\blaw (firm|office|group)\b|\blegal\b|\bprobate\b|\bestate planning\b"),
    ("a health practice", r"\bchiropract\w+|\btherap(y|ist|ists)\b|\bcounsel(ing|or|ors)\b|\bwellness\b"),
    ("a restaurant or food business", r"\brestaurant\b|\bmenu\b|\bcafe\b|\bbakery\b|\bbrunch\b|\breservations?\b"),
    ("a coach or consultant", r"\bcoach(ing|es)?\b|\bconsult(ing|ant|ants)\b"),
    ("a photographer", r"\bphotograph(er|y)\b|\bphoto sessions?\b"),
]


# The weakest way a trade is found: word counts alone. Red flags for a trade's rules are not raised
# on it (security.red_flags, trade_sure).
INDUSTRY_GUESSED = "the words on its home page"


def detect_industry(types, identity, text):
    """identity: titles, descriptions and main headings, where a business says what it is.
    text: identity plus the top of the home page. A trade must be named in the identity and be
    clearly ahead in the text, or be overwhelmingly ahead in the text alone. A website builder's
    home page shows salon templates; a law firm closes real estate deals."""
    words = lambda pat, t: len(re.findall(pat, t, re.I))
    for t in sorted(types):
        if t in TYPE_INDUSTRY:
            ind = TYPE_INDUSTRY[t]
            # The markup names the family; the words pick the member (Dentist markup on an
            # orthodontist's site, DaySpa on a med spa's).
            fam = FAMILY.get(ind)
            if fam:
                members = sorted(((words(p, text), i) for i, p in WORD_INDUSTRY if FAMILY.get(i) == fam), reverse=True)
                if members and members[0][0] >= 3 and members[0][1] != ind and re.search(dict(WORD_INDUSTRY)[members[0][1]], identity, re.I):
                    ind = members[0][1]
            return ind, "the site's own structured data says %s" % t
    fams = {}
    for ind, pat in WORD_INDUSTRY:
        n = words(pat, text)
        f = FAMILY.get(ind, ind)
        best = fams.get(f)
        fams[f] = (best[0] + n, best[1] if best[2] >= n else ind, max(best[2], n), best[3] or bool(re.search(pat, identity, re.I))) \
            if best else (n, ind, n, bool(re.search(pat, identity, re.I)))
    for label, pat in OTHER_TRADES:
        n = words(pat, text)
        fams["other:" + label] = (n, None, n, bool(re.search(pat, identity, re.I)))
    ranked = sorted(fams.items(), key=lambda kv: -kv[1][0])
    (fam, (top, ind, _, named)), second = ranked[0], ranked[1][1][0]
    if fam.startswith("other:"):
        return "general", "it reads as %s, which has no trade rules here" % fam[6:]
    if top >= 3 and top >= 2 * second and named:
        return ind, "its home page says so (%d mentions)" % top
    if top >= 8 and top >= 3 * second:
        return ind, INDUSTRY_GUESSED + " (%d mentions)" % top
    return "general", "nothing on its home page named a regulated trade"


def detect_state(nodes_by_page):
    for nodes in nodes_by_page:
        for n in nodes:
            for d in walk(n):
                reg = d.get("addressRegion") if isinstance(d, dict) else None
                if isinstance(reg, str) and reg.strip():
                    r = reg.strip()
                    code = r.upper() if len(r) == 2 else US_STATES.get(r.lower())
                    if code and code in US_STATES.values():
                        return code
    return ""


class Report:
    def __init__(self):
        self.checks = []

    def add(self, group, name, status, detail="", count=None, pages=None, why="", fix=None, owner=None):
        self.checks.append({"group": group, "name": name, "status": status, "detail": detail,
                            "count": count, "pages": (pages or [])[:8], "why": why,
                            "fix": FIX.get(name, "") if fix is None else fix,
                            "owner": owner})


def pathof(url):
    return urlparse(url).path or "/"


def normalize_url(url):
    url = (url or "").strip().strip("<>\"'")
    if not re.match(r"^https?://", url, re.I):
        url = "https://" + url.lstrip("/")
    host = urlparse(url).hostname or ""
    if not host or not ("." in host or host == "localhost" or re.match(r"^[\d.]+$|^\[", host)):
        return None
    return url


def unreachable(url, label, message, status=0, extra=None):
    # Every report shape carries the launch targets (BAR) and the page caps, so no surface ever shows
    # a label with no number or the wrong "up to N pages".
    out = {"url": url, "label": label, "reachable": False, "status": status,
           "measuredAt": datetime.now().isoformat(timespec="minutes"), "message": message, "bar": dict(BAR),
           "caps": {"pages": MAX_PAGES, "links": MAX_LINKS}}
    out.update(extra or {})
    out.setdefault("platform", dict(security.NOT_MEASURED))  # an unread page names nothing
    out.setdefault("redFlags", [])
    return out


LH_KEYS = ("performance", "accessibility", "bestPractices", "seo", "lcp", "cls")
LH_SCORES = ("performance", "accessibility", "bestPractices", "seo")


# ---------------------------------------------------------------------- the trust checks
# Everything outside the pages themselves: the certificate, public records (RDAP), DNS (over HTTPS),
# robots and sitemap dates. Read-only, public records only, a handful of requests, never a login
# attempt. Each reader returns None when it could not read, which becomes "not measured", never a pass.
# The readers sit in EXTERNAL so a test can swap them; a site on this computer never reaches them.
TWO_PART_TLDS = {"co.uk", "org.uk", "com.au", "co.nz", "com.br", "co.za", "co.in", "com.mx"}


# Addresses a hosting company hands out. The records behind them (domain, email) belong to the hosting
# company, not to the site's owner, so reading them would be reading someone else's. Seen 2026-10-24:
# realtor-site-seed.vercel.app "passed" email trust on Vercel's own records.
HOSTING_DOMAINS = {"vercel.app", "netlify.app", "github.io", "pages.dev", "herokuapp.com", "onrender.com", "web.app", "firebaseapp.com",
                   "azurewebsites.net", "wordpress.com", "blogspot.com", "weebly.com", "wixsite.com", "squarespace.com", "myshopify.com",
                   "godaddysites.com", "webflow.io", "fly.dev", "ghost.io", "carrd.co", "framer.app", "framer.website", "replit.app",
                   "repl.co", "glitch.me", "surge.sh", "workers.dev", "up.railway.app", "trycloudflare.com", "ngrok.app", "ngrok-free.app"}


def owns_apex(host):
    """The address is the registered domain itself or its www. A subdomain (jane.kw.com, shop.example.co.jp) belongs
    to whoever holds the parent domain, an IP number to nobody we can ask: their records are not this site's."""
    h = host.lower().strip("[]").strip(".")
    if h.count(":") >= 2 or re.fullmatch(r"[\d.]+|[\da-f:]+", h):
        return False  # an IPv6 or numeric address
    h = h.split(":")[0]
    if h.startswith("www."):
        h = h[4:]
    return h == registrable(h)


def on_hosting_address(host):
    h = host.split(":")[0].lower().strip(".")
    return any(h == d or h.endswith("." + d) for d in HOSTING_DOMAINS)


def registrable(host):
    h = host.split(":")[0].lower().strip(".")
    if h.startswith("www."):
        h = h[4:]
    parts = h.split(".")
    if len(parts) >= 3 and (".".join(parts[-2:]) in TWO_PART_TLDS or (len(parts[-1]) == 2 and parts[-2] in ("co", "com", "org", "net", "gov", "edu", "ac", "ne", "or", "go"))):
        return ".".join(parts[-3:])
    return ".".join(parts[-2:]) if len(parts) >= 2 else h


def _json_get(url):
    saved = STATE["cert"]
    STATE["cert"] = None
    try:
        s, _, t = fetch(url, limit=300000)
    finally:
        STATE["cert"] = saved
    if s != 200:
        return None
    try:
        return json.loads(t)
    except ValueError:
        return None


def _doh(name):
    """TXT strings for a DNS name, [] when it has none, None when DNS could not be read."""
    j = _json_get("https://dns.google/resolve?name=%s&type=TXT" % quote(name, safe=""))
    if not isinstance(j, dict) or j.get("Status") not in (0, 3):
        return None
    return security.txt_values(j)


def _rdap(domain):
    return security.parse_rdap(_json_get("https://rdap.org/domain/%s" % quote(domain, safe="")))


def _host_of(hostname):
    j = _json_get("https://dns.google/resolve?name=%s&type=A" % quote(hostname, safe=""))
    ips = [a.get("data") for a in (j or {}).get("Answer", []) if isinstance(a, dict) and a.get("type") == 1] if isinstance(j, dict) else []
    if not ips:
        return None
    r = _json_get("https://rdap.org/ip/%s" % quote(str(ips[0]), safe=""))
    return str(r.get("name"))[:80] if isinstance(r, dict) and r.get("name") else None


def public_ips(hostname):
    """The addresses a name resolves to, only when EVERY one is public; else None. Numeric spellings of an address
    (2130706433, 0x7f000001, 0177.0.0.1) are refused unless they are the plain canonical form, because the resolver
    here and the one in curl read them differently. A page chooses the addresses of its own scripts, and nothing a page
    names may make this computer reach into its own network. A name that does not resolve is refused. The caller
    connects to the returned address, not to the name, so the answer cannot change between the check and the connection."""
    import ipaddress
    h = (hostname or "").strip().strip("[]").rstrip(".")
    if not h:
        return None
    try:
        if str(ipaddress.ip_address(h)) != h:
            return None
    except ValueError:
        if re.fullmatch(r"[0-9a-fA-FxX.:]+", h) and re.search(r"\d", h):
            return None  # looks like an address in a spelling we do not accept
    try:
        addrs = []
        for ai in socket.getaddrinfo(h, None):
            if ai[4][0] not in addrs:
                addrs.append(ai[4][0])
    except (OSError, UnicodeError):
        return None
    out = []
    for a in addrs:
        try:
            ip = ipaddress.ip_address(a.split("%")[0])
        except ValueError:
            return None
        if not (getattr(ip, "ipv4_mapped", None) or ip).is_global:
            return None
        out.append(a)
    return out or None


def host_is_public(hostname):
    return public_ips(hostname) is not None


def _head_length(url):
    """Content-Length of one outside script, from a single HEAD that is NOT redirected and goes to the address that was
    vetted. None when it is not a plain answer with a length."""
    u = urlparse(url)
    ips = public_ips(u.hostname)
    if not ips or u.scheme not in ("http", "https"):
        return None
    port = u.port or (443 if u.scheme == "https" else 80)
    path = (u.path or "/") + (("?" + u.query) if u.query else "")
    try:
        raw = socket.create_connection((ips[0], port), timeout=10)
        try:
            if u.scheme == "https":
                raw = ssl.create_default_context().wrap_socket(raw, server_hostname=u.hostname)
            raw.settimeout(10)
            raw.sendall(("HEAD %s HTTP/1.1\r\nHost: %s\r\nUser-Agent: %s\r\nAccept: */*\r\nConnection: close\r\n\r\n" % (path, u.netloc, UA)).encode("ascii", "ignore"))
            data = b""
            while b"\r\n\r\n" not in data and len(data) < 16384:
                chunk = raw.recv(4096)
                if not chunk:
                    break
                data += chunk
        finally:
            raw.close()
    except (OSError, ssl.SSLError, UnicodeError):
        return None
    head = data.split(b"\r\n\r\n")[0].decode("latin-1", "ignore")
    m = re.match(r"HTTP/\d(?:\.\d)?\s+(\d{3})", head)
    if not m or not m.group(1).startswith("2"):
        return None  # a redirect or an error: not followed, not guessed
    n = re.search(r"(?im)^content-length:\s*(\d+)\s*$", head)
    return int(n.group(1)) if n else None


def _cert_days(hostname):
    """Days left on the certificate; negative when it has expired; None when it could not be read (or fails
    for another reason, which the 'Valid security certificate' check already reports)."""
    ips = public_ips(hostname)
    if not ips:
        return None
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((ips[0], 443), timeout=10) as raw:
            with ctx.wrap_socket(raw, server_hostname=hostname) as tls:
                end = tls.getpeercert().get("notAfter")
        return int((ssl.cert_time_to_seconds(end) - time.time()) // 86400) if end else None
    except ssl.SSLCertVerificationError as e:
        return -1 if "expired" in str(getattr(e, "verify_message", "") or e).lower() else None
    except Exception:
        return None


EXTERNAL = {"doh": _doh, "rdap": _rdap, "host_of": _host_of, "cert_days": _cert_days}


def _city(pages):
    for p in pages:
        for n in p.get("nodes") or []:
            for d in walk(n):
                a = d.get("address")
                if isinstance(a, dict) and isinstance(a.get("addressLocality"), str) and a["addressLocality"].strip():
                    return a["addressLocality"].strip()[:60]
    return None


def _places(pages):
    """Every place the business says it is in or serves, its own city first.

    The AI-readiness check asks whether an article names the place it is about.
    Given only the head-office city it marked correct pages as faults, because
    a business working across a county writes one page per town and putting the
    head office in all of those titles would be the wrong title. `areaServed`
    is where the site already lists those towns, so it is what the check reads.

    "Brentwood, CA" becomes "Brentwood": a title names the town, not the state.
    """
    out, seen = [], set()

    def add(value):
        if not isinstance(value, str):
            return
        name = value.split(",")[0].strip()
        if name and len(name) <= 60 and name.lower() not in seen:
            seen.add(name.lower())
            out.append(name)

    add(_city(pages))
    for p in pages:
        for n in p.get("nodes") or []:
            for d in walk(n):
                area = d.get("areaServed")
                for item in (area if isinstance(area, list) else [area]):
                    add(item.get("name") if isinstance(item, dict) else item)
    return out


def _http_lands(netloc):
    """Where the plain http:// address ends up. Redirects are followed here, one hop at a time, because
    Python before 3.11 does not follow a 308 (what Vercel and others send) and would report it as
    'stayed on http'. None when nothing answered."""
    u = "http://%s/" % netloc
    for _ in range(4):
        s, f, _ = fetch(u)
        if s in (301, 302, 303, 307, 308):
            loc = STATE["headers"].get("location", "")
            try:
                u = urljoin(u, loc) if loc else u
            except ValueError:
                return u
            if not loc or u.lower().startswith("https://") or not allowed(u):
                return u if loc else None
            continue
        return f if s else None
    return u


def _admin_status(url, expect):
    """Status of a WordPress admin file, asked with one GET. A redirect away from the file, or any answer that is
    not the file itself, means it does not answer (404). A security service answering, or no answer at all, is None:
    not measured, never 'does not answer'."""
    s, final, _ = fetch(url)
    if s in (0, 401, 403, 429, 503):
        return None
    if 300 <= s < 400 or (s == 200 and expect not in urlparse(final).path):
        return 404
    return s


def trust_gather(home, host, headers, html, platform, ok, local, now, public=False):
    """-> ({"checks": [...], "ownership": {...} or None}). Pure reading; see the block comment above."""
    private = bool(STATE["private_ok"] or local)
    https = home.lower().startswith("https://")
    hostname = urlparse(home).hostname or host
    dom = registrable(hostname)
    ex = EXTERNAL
    http_final = cert_days = None
    if https and not private:
        http_final = _http_lands(urlparse(home).netloc)
        cert_days = ex["cert_days"](hostname)
    login = xmlrpc = None
    if platform.get("platform") == "WordPress" and not public:
        # Two requests for pages the site does not link to. Inside BOSS the reader owns the site; the public check never asks.
        time.sleep(PAUSE)
        login = _admin_status(urljoin(home, "/wp-login.php"), "wp-login")
        time.sleep(PAUSE)
        xmlrpc = _admin_status(urljoin(home, "/xmlrpc.php"), "xmlrpc")
    checks = security.security_score(home, headers, html, http_final, cert_days, platform, login, xmlrpc)
    record = host_name = None
    dmarc = spf = None
    if not private and (on_hosting_address(hostname) or not owns_apex(hostname)):
        # The address belongs to a hosting company, a brokerage, or whoever holds the parent domain: its records are theirs.
        msg = "Not looked up: this address belongs to the company that hosts the site or holds its parent domain, so its records are theirs."
        checks += [security._nm(security.G_OWN, "Domain registration has time left", msg),
                   security._nm(security.G_MAIL, "Email impersonation protection (DMARC)", msg),
                   security._nm(security.G_MAIL, "Approved email senders (SPF)", msg),
                   security._nm(security.G_MAIL, "Email signing (DKIM)", "Not measured: the name of the signing key is private to whoever sends the email.")]
    elif not private:
        record = ex["rdap"](dom)
        host_name = ex["host_of"](hostname)
        dmarc = ex["doh"]("_dmarc." + dom)
        txt = ex["doh"](dom)
        spf = None if txt is None else [t for t in txt if t.lower().lstrip().startswith("v=spf1")]
        checks += security.ownership_checks(record, now) + security.email_checks(dmarc, spf)
    else:
        checks += [security._nm(security.G_OWN, "Domain registration has time left", "Not looked up: the site is not on the internet."),
                   security._nm(security.G_MAIL, "Email impersonation protection (DMARC)", "Not looked up: the site is not on the internet."),
                   security._nm(security.G_MAIL, "Approved email senders (SPF)", "Not looked up: the site is not on the internet."),
                   security._nm(security.G_MAIL, "Email signing (DKIM)", "Not measured: the name of the signing key is private to whoever sends the email.")]
    st, _, robots = fetch(urljoin(home, "/robots.txt"))
    robots_text = robots if st == 200 else ("" if st in (404, 410) else None)
    sm_dates = []
    st, _, xml = fetch(urljoin(home, "/sitemap.xml"))
    if st == 200:
        for d in re.findall(r"<lastmod>\s*(\d{4}-\d{2}-\d{2})", xml[:2_000_000]):
            try:
                sm_dates.append(datetime.strptime(d, "%Y-%m-%d"))
            except ValueError:
                pass
    checks += security.ai_checks(robots_text, ok, _places(ok), sm_dates, now)
    home_page = ok[0]
    dates = [d for p in ok for d in security.post_dates(p["raw"][:300000], now)]
    outside = []
    for src in re.findall(r"<script\b[^>]{0,2000}?\bsrc\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>\"']+)", security._strip(home_page["raw"][:600000]), re.I):
        u = src.strip("\"'")
        if u.startswith("//"):
            u = "https:" + u
        h = urlparse(u).hostname
        if u.lower().startswith("http") and h and registrable(h) != dom and u not in outside:
            outside.append(u)
    weight = None
    if not private and outside and len(outside) <= 10 and all(host_is_public(urlparse(u).hostname) for u in outside):
        total = 0
        for u in outside:
            time.sleep(PAUSE / 2)
            n = _head_length(u)
            if n is None:
                total = None
                break
            total += n
        weight = total
    elif not outside:
        weight = 0
    checks += security.care_checks(home_page["visible"], dates, outside, weight, now)
    return {"checks": checks, "ownership": security.ownership_facts(record, host_name) if (record or host_name) else None}



def audit(url, label="Your website", industry="auto", state="", local=False, lighthouse=True, log=None, who="", public=False):
    log = log or (lambda m: print("  " + m, file=sys.stderr, flush=True))
    raw_url = url
    url = normalize_url(url)
    if not url:
        return unreachable(raw_url, label, "That does not look like a website address. Try something like example.com.")
    started = time.time()
    STATE["cert"] = None
    # A site on this computer or network may redirect within it; a site on the internet may not.
    STATE["private_ok"] = bool(LOCAL_TARGETS_OK and (local or _local_by_name(url)))

    lh = {}
    lh_thread = None
    if lighthouse:
        lh_thread = threading.Thread(target=lighthouse_any, args=(url, lh, local), daemon=True)
        lh_thread.start()
        log("Checking %s (Google's Lighthouse test runs alongside)..." % url)
    else:
        lh["_error"] = "Skipped on request (--no-lighthouse)"
        lh["_skipped"] = True
        log("Checking %s..." % url)

    def wait_lh(limit):
        if lh_thread:
            lh_thread.join(timeout=max(5, limit - (time.time() - started)))

    status, final, html = fetch(url)
    if status == 0 and url.lower().startswith("https://"):
        alt = "http://" + url[8:]
        s2, f2, h2 = fetch(alt)
        if s2:
            status, final, html = s2, f2, h2
    def lh_done():
        if lh_thread and lh_thread.is_alive():
            lh.setdefault("_error", "Google's test had not finished when the check ended")
            lh["_timeout"] = True

    def lh_out(home_state, page_text=""):
        # An unreadable site still says why Google's test has no scores (lighthouse_unavailable).
        lh_done()
        crawl = {"home": home_state, "status": status, "notLaunched": STATE["private_ok"] or looks_unlaunched("", [], page_text)}
        return {"lighthouse": {k: lh.get(k) for k in LH_KEYS}, "screenshot": lh.get("screenshot"),
                "lighthouseSource": lh.get("_source"),
                "lighthouseError": lh.get("_error") if lh.get("performance") is None else None,
                "lighthouseUnavailable": lighthouse_unavailable(lh, crawl, graded=False)}
    if status == 0:
        wait_lh(40)
        return unreachable(url, label, "The site did not answer. Check the address is right and the site is up.", 0, lh_out("no-answer"))
    headers = dict(STATE["headers"])
    if is_bot_wall(status, html, headers):
        log("A security service answered instead of the site; waiting for Lighthouse...")
        wait_lh(300)
        return unreachable(url, label, "The site's security service (%s) turned our checker away, so its pages could not be read. "
                           "That is the site protecting itself, not a fault. If Google's own test reached the site, its scores show below."
                           % (headers.get("server") or "a bot shield"), status, dict(lh_out("blocked"), blocked=True))
    if status in (401, 403, 429):
        wait_lh(300)
        return unreachable(url, label, "The site refused our checker (error %d), so its pages could not be read. That is almost always "
                           "bot protection, not a fault visitors see. If Google's own test reached the site, its scores show below." % status,
                           status, dict(lh_out("blocked"), blocked=True))
    if status >= 400:
        wait_lh(40)
        return unreachable(url, label, "The home page answered with error %d, so nothing else could be measured." % status, status,
                           lh_out("broken", re.sub(r"<[^>]{0,2000}>", " ", html[:20000])))
    ctype = headers.get("content-type", "text/html")
    if ctype and not re.search(r"html|xml", ctype, re.I) and "<html" not in html[:2000].lower():
        wait_lh(40)
        return unreachable(url, label, "That address is a file (%s), not a web page." % ctype.split(";")[0], status, lh_out("not-html"))

    home = final
    host = urlparse(home).netloc.lower()
    hp = PageParser()
    try:
        hp.feed(html)
    except Exception:
        pass  # malformed markup: keep what parsed

    log("Reading the sitemap and robots file...")
    has_robots, robots_blocks_all, has_sitemap, sm_pages = sitemap_urls(home, host)
    llms_status, _, llms = fetch(urljoin(home, "/llms.txt"), limit=4096)
    has_llms = llms_status == 200 and len(llms.strip()) > 20 and "<html" not in llms[:500].lower() and "<!doctype" not in llms[:200].lower()

    targets = pick_pages(home, sm_pages, hp.links, host)
    log("Reading %d pages, one at a time..." % len(targets))
    pages, all_links = [], {}
    walled, in_a_row = 0, 0
    out_of_time = False
    for i, p in enumerate(targets):
        if i == 0:
            s, body = status, html
        else:
            if in_a_row >= 3:
                break  # the shield has noticed us: stop rather than push
            if CRAWL_SECONDS and time.time() - started > CRAWL_SECONDS:
                out_of_time = True
                break
            time.sleep(PAUSE)
            s, _, body = fetch(p)
            if is_bot_wall(s, body, STATE["headers"]):
                walled += 1
                in_a_row += 1
                continue
            in_a_row = 0
            if not re.search(r"html|xml", STATE["headers"].get("content-type", "text/html"), re.I):
                body = ""  # a PDF or image in the sitemap is not a page to read
        pp = PageParser()
        if body:
            try:
                pp.feed(body)
            except Exception:
                pass  # malformed markup: keep what parsed
        nodes, ld_problems = parse_ld(pp.ld)
        internal = []
        for href in pp.links:
            if re.match(r"^\s*(javascript:|data:text/html)", href, re.I) and not re.match(r"^\s*javascript:\s*(void\(0\);?|;)?\s*$", href, re.I):
                internal.append("__unsafe__")
                continue
            try:
                u = urldefrag(urljoin(p, href.strip()))[0]
            except ValueError:
                continue
            if u.startswith("http") and same_site(u, host):
                internal.append(u)
                all_links.setdefault(link_key(u), u)
        visible = norm_space(htmllib.unescape(" ".join(pp.texts)))
        main = norm_space(htmllib.unescape(" ".join(pp.main_texts))) or visible
        pages.append({
            "url": p, "path": pathof(p), "status": s, "title": norm_space(pp.title)[:140],
            "desc": pp.meta.get("description", ""), "h1s": [norm_space(h) for h in pp.h1s],
            "canonical": pp.canonical, "ogTitle": pp.meta.get("og:title", ""), "ogImage": pp.meta.get("og:image", ""),
            "viewport": "viewport" in pp.meta, "lang": pp.lang, "imgs": pp.imgs, "imgsNoAlt": pp.imgs_no_alt,
            "nodes": nodes, "ldProblems": ld_problems, "types": sorted(node_types(nodes)),
            "internal": internal, "visible": visible, "main": main,
            "paras": [norm_space(x) for x in pp.paras if len(norm_space(x)) > 20],
            "scripts": pp.scripts, "raw": body or "",
            # What a visitor (or Google) could read: page text, form placeholders, structured data.
            "scrubtext": norm_space(" ".join(pp.texts + pp.attr_texts + pp.ld))[:400000],
        })

    ok = [p for p in pages if 200 <= p["status"] < 300 and p["raw"]]
    if not ok or not (ok[0]["visible"] or ok[0]["title"] or ok[0]["scripts"]):
        # Nothing to read means nothing measured; never "all 0 pages passed".
        wait_lh(120)
        return unreachable(home, label, "The home page answered but sent back an empty page, so there was nothing to check.", status, lh_out("empty"))
    page_keys = {link_key(p["url"]) for p in pages}
    # /cdn-cgi/ links are Cloudflare's own (its email-address protection works in a browser and
    # answers 404 to everything else). They are not the owner's pages.
    to_check = [u for k, u in sorted(all_links.items()) if k not in page_keys and not ASSET.search(u)
                and "/cdn-cgi/" not in u][:MAX_LINKS]
    log("Following %d more links to look for dead ends..." % len(to_check))
    broken_links, refused = [], 0
    for j, u in enumerate(to_check):
        if CRAWL_SECONDS and time.time() - started > CRAWL_SECONDS:
            out_of_time = True
            to_check = to_check[:j]  # only what was really followed is counted
            break
        time.sleep(PAUSE / 2)
        s = check_status(u)
        if s in (-1, 401, 403, 429):
            refused += 1  # refused us, not necessarily a visitor: not counted as broken
        elif s >= 400 or s == 0:
            broken_links.append({"url": u, "status": s})
    broken_pages = [p["url"] for p in pages if p["status"] >= 400 or p["status"] == 0]

    # ---- what kind of business, and where. The site's own markup first, its words second.
    all_types = set()
    for p in ok:
        all_types.update(p["types"])
    # What the site says it is: titles, descriptions, main headings, and the top of the home page.
    # Not every word on every page: a website builder's home page names salons and plumbers too.
    # The home page is where a business says what it is. Other pages are a sample, and on a
    # big site the sample can be anything (Wix's own pages include barber templates).
    hm = ok[0] if ok and ok[0]["url"] == home else (ok[0] if ok else None)
    identity = (hm["title"] + " " + hm["desc"] + " " + " ".join(hm["h1s"]) + " " + hm.get("ogTitle", "")) if hm else ""
    corpus = identity + " " + (hm["main"][:4000] if hm else "")
    chosen, who_label = security.trade_for(who)  # raises KeyError on a choice we do not offer
    if chosen == "auto" and industry in (None, "", "auto"):
        industry, industry_why = detect_industry(all_types, identity, corpus)
        industry_auto = True
    elif chosen != "auto":
        # The owner said who they are: that decides the trade rules, whatever the page's markup says.
        if chosen is None:  # a local service business: an explicit trade wins, else detect among the service trades; never real estate or lending
            if industry in (None, "", "auto"):
                industry, _ = detect_industry(all_types, identity, corpus)
            if industry in ("real-estate", "lender"):
                industry = "general"
        else:
            industry = chosen
        industry_why, industry_auto = "you told us you are %s" % who_label, False
    else:
        industry_why, industry_auto = "chosen when the check was run", False
    state_src = "chosen when the check was run"
    if not state:
        state = detect_state([p["nodes"] for p in ok])
        state_src = "the address in the site's structured data" if state else ""
    state = (state or "").upper()

    log("Waiting for Lighthouse to finish...")
    wait_lh(450)
    if lh_thread and lh_thread.is_alive():
        lh.setdefault("_error", "Google's test was still running after five minutes, so it was stopped")
        lh["_timeout"] = True

    R = Report()
    re_profile = industry == "real-estate"
    lender_profile = industry == "lender"
    paths = lambda ps: [p["path"] for p in ps]

    # ---- 1. Google Lighthouse
    G = "Google's own test (Lighthouse, on a phone)"
    names = {"performance": "Speed", "accessibility": "Accessibility", "bestPractices": "Best practices", "seo": "SEO"}
    # Our own plain read of the same home page: the evidence that tells a broken page from a
    # checker that was turned away or ran out of time (see THE GRADE, IN ONE PLACE).
    home_page = ok[0]
    crawl = {"home": "ok", "status": status, "noWords": is_js_shell(home_page),
             "notLaunched": STATE["private_ok"] or looks_unlaunched(home_page["title"], home_page["h1s"], home_page["visible"])}
    lh_unavailable = lighthouse_unavailable(lh, crawl, graded=True)
    lh_failed = bool(lh_unavailable and lh_unavailable["effect"] == "failed")
    for k, nm in names.items():
        v = lh.get(k)
        if v is None and lh_unavailable:
            if lh_failed:
                # The page itself is broken: each score counts as a failure (0) in the grade.
                R.add(G, nm, "fail", lh_unavailable["reason"], fix=LH_BROKEN_FIX)
                R.checks[-1]["sameCause"] = k != "performance"  # one entry in "Fix these first", not four
            else:
                R.add(G, nm, "local" if lh_unavailable["cause"] == "not-launched" else "notMeasured", lh_unavailable["reason"], fix="")
        elif v is None:
            why = lh.get("_error") or "Lighthouse did not finish"
            if k == "performance" and lh.get("accessibility") is not None:
                why = ("Google's test could not time how fast this page loads (it never showed a main picture or "
                       "headline it could measure); the other three scores below are real")
            R.add(G, nm, "notMeasured", why, fix="")
        else:
            excused = local and k == "seo" and all(f["id"] in ("is-crawlable", "canonical") for f in lh.get("seoFailed", []))
            st = "pass" if v >= BAR[k] else ("local" if excused else "fail")
            R.add(G, nm, st, "%d out of 100 (launch target: %d%s)" % (v, BAR[k], "+" if BAR[k] < 100 else ""))
    for f in lh.get("a11yFailed", []):
        R.add(G, f["title"], "fail", "%s found%s" % (f["count"] or "Some", (": " + "; ".join('"%s"' % w for w in f.get("where", []))) if f.get("where") else ""),
              why="Checked by axe-core inside Lighthouse, the same engine the seed's browser audit uses.",
              fix=A11Y_FIX.get(f["id"], "Ask whoever maintains the site to fix each one listed."))

    # ---- 2. Findable by Google and AI
    G = "Can Google and AI assistants find it"
    R.add(G, "Secure connection (https)", "pass" if home.startswith("https://") else ("local" if local else "fail"),
          "" if home.startswith("https://") else ("Comes with publishing" if local else "Browsers warn visitors away"))
    if home.startswith("https://") and not local:
        if STATE["cert"] == "bad":
            R.add(G, "Valid security certificate", "fail", "The certificate is expired, self-signed or for another address: browsers show visitors a full-page warning")
        elif STATE["cert"] == "unverified":
            R.add(G, "Valid security certificate", "notMeasured", "This computer could not check certificates; a browser will tell you", fix="")
        else:
            R.add(G, "Valid security certificate", "pass")
    R.add(G, "Sitemap", "pass" if has_sitemap else "fail", "%d pages listed" % len(sm_pages) if has_sitemap else "No sitemap.xml: Google has to guess what pages exist")
    if robots_blocks_all:
        R.add(G, "Search engines allowed in", "local" if local else "fail", "robots.txt blocks every search engine")
    else:
        R.add(G, "Search engines allowed in", "pass" if has_robots else "warn", "" if has_robots else "No robots.txt",
              fix=None if has_robots else "Publish a robots.txt that allows search engines and names your sitemap.")
    bad_title = [p for p in ok if not (10 <= len(p["title"]) <= 65)]
    R.add(G, "Page titles the right length", "pass" if not bad_title else "fail",
          ("%d of %d pages have a title that is missing, too short or over 65 characters" % (len(bad_title), len(ok))) if bad_title else "All %d pages" % len(ok), pages=paths(bad_title))
    bad_desc = [p for p in ok if not (50 <= len(p["desc"]) <= 170)]
    R.add(G, "Search descriptions", "pass" if not bad_desc else "fail",
          ("%d of %d pages have no search description, or one outside 50 to 170 characters" % (len(bad_desc), len(ok))) if bad_desc else "All %d pages" % len(ok), pages=paths(bad_desc))
    bad_h1 = [p for p in ok if len(p["h1s"]) != 1]
    R.add(G, "Exactly one main heading", "pass" if not bad_h1 else "fail",
          ("%d of %d pages have no main heading (H1) or more than one" % (len(bad_h1), len(ok))) if bad_h1 else "All %d pages" % len(ok), pages=paths(bad_h1))
    no_canon = [p for p in ok if not p["canonical"]]
    rel_canon = [p for p in ok if p["canonical"] and not re.match(r"^https?://", p["canonical"])]
    wrong_canon = [p for p in ok if re.match(r"^https?://", p["canonical"] or "") and pathof(p["canonical"]).rstrip("/") != p["path"].rstrip("/")]
    if no_canon:
        R.add(G, "Canonical address on every page", "fail", "Missing on %d of %d pages" % (len(no_canon), len(ok)), pages=paths(no_canon))
    elif rel_canon or wrong_canon:
        R.add(G, "Canonical address on every page", "fail", "%d pages point somewhere else or use a partial address" % (len(rel_canon) + len(wrong_canon)), pages=paths(rel_canon + wrong_canon))
    else:
        R.add(G, "Canonical address on every page", "pass")
    no_og = [p for p in ok if not (p["ogTitle"] and p["ogImage"])]
    R.add(G, "Share preview (title + image)", "pass" if not no_og else "fail",
          "Missing on %d of %d pages: a shared link shows no picture" % (len(no_og), len(ok)) if no_og else "", pages=paths(no_og))
    R.add(G, "Works on a phone (viewport)", "pass" if all(p["viewport"] for p in ok) else "fail", pages=paths([p for p in ok if not p["viewport"]]))
    R.add(G, "Language declared", "pass" if all(p["lang"] for p in ok) else "fail", pages=paths([p for p in ok if not p["lang"]]))
    R.add(G, "llms.txt for AI assistants", "pass" if has_llms else "fail", "" if has_llms else "A short file written for AI assistants that says who you are. Cheap, rarely done.")
    imgs = sum(p["imgs"] for p in ok)
    no_alt = sum(p["imgsNoAlt"] for p in ok)
    R.add(G, "Every image described", "pass" if not no_alt else "fail", "%d of %d images have no description" % (no_alt, imgs) if no_alt else "%d images" % imgs,
          pages=paths([p for p in ok if p["imgsNoAlt"]]))
    # AI crawlers (GPTBot, ClaudeBot, PerplexityBot) read the HTML as sent; they do not run JavaScript.
    words = page_words
    js_only = [p for p in ok if is_js_shell(p)]
    R.add(G, "Words readable without JavaScript", "pass" if not js_only else "fail",
          "%d of %d pages show almost no words until JavaScript runs" % (len(js_only), len(ok)) if js_only else "%d words on the home page as sent" % (words(ok[0]) if ok else 0),
          pages=paths(js_only), why="Google runs JavaScript; most AI assistants and link previews do not. If the words are not in the page as sent, they never see them.")

    # ---- 3. Structured data (validate-schema.mjs)
    G = "Structured data (how AI reads your business)"
    no_ld = [p for p in ok if not p["nodes"]]
    R.add(G, "On every page", "pass" if not no_ld else "fail",
          ("%d of %d pages have no structured data" % (len(no_ld), len(ok))) if no_ld else "All %d pages" % len(ok), pages=paths(no_ld))
    bad_json = [p for p in ok if p["ldProblems"]]
    R.add(G, "Written correctly (valid JSON)", "pass" if not bad_json else "fail", pages=paths(bad_json))
    no_type = [p for p in ok if any(isinstance(nd, dict) and "@type" not in nd for nd in p["nodes"])]
    R.add(G, "Every item says what it is (@type)", "pass" if not no_type else "fail", pages=paths(no_type))
    dangling = [p for p in ok if id_problems(p["nodes"])]
    R.add(G, "Every cross-reference resolves (@id)", "pass" if not dangling else "fail", pages=paths(dangling))
    R.add(G, "Says this is a business", "pass" if any(BUSINESS.search(t) for t in all_types) else "fail",
          "Found: %s" % ", ".join(sorted(all_types)[:8]) if all_types else "No business, organization or person markup")
    if re_profile:
        missing = [p for p in ok if not set(RE_TYPES) <= set(p["types"])]
        R.add(G, "Agent, person, brokerage and website on every page", "pass" if not missing else "fail",
              "The seed requires Organization, WebSite, RealEstateAgent and Person on every page", pages=paths(missing))
    faq_pages = [p for p in ok if "FAQPage" in p["types"]]
    R.add(G, "Questions marked up for AI answers (FAQ)", "pass" if faq_pages else "fail",
          "" if faq_pages else "AI assistants answer questions. Sites that mark up their answers are the ones they quote.")
    hidden_q = []
    for p in faq_pages:
        asked = 0  # the first 200 questions per page: a real FAQ has far fewer; a hostile one is capped
        for nd in p["nodes"]:
            for d in walk(nd):
                if d.get("@type") == "Question" and isinstance(d.get("name"), str):
                    asked += 1
                    if asked > 200:
                        break
                    if norm_space(htmllib.unescape(d["name"])) not in p["visible"]:
                        hidden_q.append(p)
                        break
            else:
                continue
            break
    if faq_pages:
        R.add(G, "FAQ markup matches what is on the page", "pass" if not hidden_q else "fail",
              "" if not hidden_q else "Google penalises questions in the markup that visitors cannot see", pages=paths(hidden_q))

    # ---- 4. Broken
    G = "Broken pages and dead ends"
    R.add(G, "Pages that load", "pass" if not broken_pages else "fail", "%d of %d pages failed to load" % (len(broken_pages), len(pages)) if broken_pages else "%d of %d" % (len(pages), len(pages)), pages=[pathof(u) for u in broken_pages])
    R.add(G, "Links that go somewhere", "pass" if not broken_links else "fail",
          "%d of %d links lead nowhere" % (len(broken_links), len(to_check)) if broken_links else "%d links followed" % len(to_check),
          pages=[pathof(b["url"]) for b in broken_links])
    unsafe = [p for p in ok if "__unsafe__" in p["internal"]]
    R.add(G, "Every link opens a real page", "pass" if not unsafe else "fail",
          "%d pages have links that run a script instead of opening a page; search engines and some phones cannot follow them" % len(unsafe) if unsafe else "", pages=paths(unsafe))
    home_path = re.sub(r"index\.html?$", "", pathof(home)).rstrip("/") or "/"
    is_home = lambda u: (re.sub(r"index\.html?$", "", pathof(u)).rstrip("/") or "/") == home_path
    contactish = re.compile(r"contact|get-in-touch|reach-us|book|schedule|appointment|request", re.I)
    no_home = [p for p in ok if not any(is_home(u) for u in p["internal"] if u != "__unsafe__")]
    no_contact = [p for p in ok if not any(contactish.search(pathof(u)) for u in p["internal"] if u != "__unsafe__")]
    few = [p for p in ok if len({link_key(u) for u in p["internal"] if u != "__unsafe__"}) < 5]
    R.add(G, "Every page links home", "pass" if not no_home else "fail", "Missing on %d of %d pages" % (len(no_home), len(ok)) if no_home else "", pages=paths(no_home))
    R.add(G, "Every page links to contact", "pass" if not no_contact else "fail", "Missing on %d of %d pages" % (len(no_contact), len(ok)) if no_contact else "", pages=paths(no_contact))
    R.add(G, "At least 5 internal links per page", "pass" if not few else "fail", "%d pages are near dead ends" % len(few) if few else "", pages=paths(few))

    # ---- 5. Words on the page (launch-check scrub)
    G = "Words on the page"
    filler_hits, bracket_hits = {}, {}
    for p in ok:
        text = p["scrubtext"]
        tl = text.lower()
        for m in FILLER:
            if re.match(r"^[a-z][a-z /]*$", m):
                pat = r"(^|[^a-z0-9])" + re.escape(m) + (r"s?" if len(m) >= 6 else "") + r"([^a-z0-9]|$)"
                hit = re.search(pat, tl)
            else:
                hit = m in tl
            if hit:
                filler_hits.setdefault(m, []).append(p["path"])
        for b in set(BRACKET.findall(text)):
            bracket_hits.setdefault(b, []).append(p["path"])
    R.add(G, "No leftover template text", "pass" if not filler_hits else "fail",
          ", ".join('"%s"' % k for k in list(filler_hits)[:6]), count=len(filler_hits),
          pages=sorted({x for v in filler_hits.values() for x in v}))
    R.add(G, "Nothing left to fill in", "pass" if not bracket_hits else ("todo" if local else "fail"),
          "; ".join(list(bracket_hits)[:8]), count=len(bracket_hits),
          pages=sorted({x for v in bracket_hits.values() for x in v}),
          why="Square-bracket blanks are facts only the owner can supply. The seed will not launch with one left.")

    def scan(patterns, texts_by_page):
        hits = []
        for pat, why in patterns:
            for path, t in texts_by_page:
                for m in re.finditer(pat, t, re.I):
                    # A denial or a question is not the claim the rule is for.
                    # See NEGATABLE and honest_mention.
                    if why in NEGATABLE and honest_mention(t, m.start(), m.end()):
                        continue
                    hits.append({"phrase": m.group(0).strip()[:80], "why": why, "page": path})
                    if len(hits) > 200:
                        return hits
        return hits

    def uniq_pages(hits):
        return list(dict.fromkeys(h["page"] for h in hits))

    mains = [(p["path"], p["main"][:200000]) for p in ok]  # scans stay fast on a huge page
    claims = scan(CLAIMS, mains)
    # The realtor seed fails these (check-article.mjs); the service seeds warn, because "say what
    # the guarantee actually is" is a judgement for a person (compliance-packs.mjs, baseline).
    claim_level = "fail" if (re_profile or lender_profile) else "warn"
    R.add(G, "No claims you would have to prove (FTC)", "pass" if not claims else claim_level,
          "; ".join('"%s" (%s)' % (h["phrase"], h["why"]) for h in claims[:5]), count=len(claims), pages=uniq_pages(claims))
    slop = scan(SLOP, mains)
    R.add(G, "Sounds like a person, not a robot", "pass" if not slop else "warn",
          "; ".join('"%s"' % h["phrase"] for h in slop[:6]), count=len(slop), pages=uniq_pages(slop),
          why="Em-dashes and stock AI phrases are the first thing readers notice.")
    dupes = []
    grams, canon = {}, {}
    for p in ok:
        w = re.findall(r"[a-z']+", p["main"][:200000].lower())[:20000]
        # Listing pages (tags, categories, blog index, page 2) and shop product variants overlap by
        # design: they are lists of the same excerpts, not two pages competing for one search.
        if re.search(r"/(tag|tags|category|categories|author|page|shop|product|products|collections)/|/blog/?$", p["path"], re.I):
            continue
        if len(w) >= 40:  # a two-line page is not a duplicate of anything worth reporting
            grams[p["path"]] = {" ".join(w[i:i + 3]) for i in range(len(w) - 2)}
            canon[p["path"]] = link_key(p["canonical"]) if re.match(r"^https?://", p["canonical"] or "") else None
    # The site's own template (menu, footer, sidebar, the same call to action on every page) is
    # not duplicate content. On a site with no <main>, it is most of a short page's words. Drop
    # what most pages share (3+ pages and 60% of them, so a real duplicate pair survives), then compare only what each page says for itself.
    if len(grams) >= 5:
        df = {}
        for g in grams.values():
            for t in g:
                df[t] = df.get(t, 0) + 1
        shared = {t for t, n in df.items() if n >= max(3, 0.6 * len(grams))}
        grams = {k: g - shared for k, g in grams.items()}
    grams = {k: g for k, g in grams.items() if len(g) >= 60}
    keys = list(grams)
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            a, b = grams[keys[i]], grams[keys[j]]
            if canon.get(keys[i]) and canon.get(keys[i]) == canon.get(keys[j]):
                continue  # two addresses that both say "the real page is X": handled, not a duplicate
            if a and b:
                sim = len(a & b) / len(a | b)
                if sim >= 0.55:
                    dupes.append("%s and %s (%d%% the same)" % (keys[i], keys[j], round(sim * 100)))
    R.add(G, "No near-duplicate pages", "pass" if not dupes else "fail", "; ".join(dupes[:4]), count=len(dupes),
          why="Two pages saying the same thing compete with each other in Google.")

    # ---- 6. Real estate rules
    if re_profile:
        G = "Real estate rules (Fair Housing and licensing)"
        fh = scan(FH_FAIL, mains)
        R.add(G, "Fair Housing language", "pass" if not fh else "fail",
              "; ".join('"%s": %s' % (h["phrase"], h["why"]) for h in fh[:5]), count=len(fh), pages=uniq_pages(fh),
              why="Describe the property, never the people.")
        fhw = scan(FH_WARN, mains)
        R.add(G, "Phrases that can read as steering", "pass" if not fhw else "warn",
              "; ".join('"%s": %s' % (h["phrase"], h["why"]) for h in fhw[:5]), count=len(fhw), pages=uniq_pages(fhw))
        com = scan(COMMISSION, mains)
        R.add(G, "Commission wording", "pass" if not com else "warn",
              "; ".join('"%s": %s' % (h["phrase"], h["why"]) for h in com[:4]), count=len(com), pages=uniq_pages(com))
        # A [Your license number] blank is not a disclosure. Blanks are stripped first and
        # reported as "to fill in", never as passed. A real license number has digits.
        bare = lambda p: BRACKET.sub(" ", p["visible"])
        lic = [p for p in ok if not re.search(r"\b(DRE|BRE|License|Lic\.?)\s*(#|No\.?|number)?\s*:?\s*[A-Z]{0,4}[- ]?\d{4,}", bare(p), re.I)]
        brk = [p for p in ok if not re.search(r"broker", bare(p), re.I)]
        eho = [p for p in ok if not re.search(r"equal housing", p["visible"], re.I)]
        blank = lambda ps, word: ps and all(re.search(r"\[[^\]]{0,200}" + word, p["visible"], re.I) for p in ps)
        R.add(G, "License number on every page", "pass" if not lic else ("todo" if blank(lic, "licen") else "fail"),
              ("Missing on %d of %d pages" % (len(lic), len(ok)) if lic else "All %d pages" % len(ok)) + ("; the blank for it is there, waiting for your number" if blank(lic, "licen") else ""), pages=paths(lic))
        R.add(G, "Brokerage named on every page", "pass" if not brk else ("todo" if blank(brk, "broker") else "fail"),
              ("Missing on %d of %d pages" % (len(brk), len(ok)) if brk else "All %d pages" % len(ok)) + ("; the blank for it is there, waiting for your brokerage" if blank(brk, "broker") else ""), pages=paths(brk))
        R.add(G, "Equal Housing Opportunity on every page", "pass" if not eho else "fail", ("Missing on %d of %d pages" % (len(eho), len(ok)) if eho else "All %d pages" % len(ok)), pages=paths(eho),
              why="The words must be on the page. A logo image alone is invisible to screen readers and to the seed's gate.")

    # ---- 6b. Lender rules
    if lender_profile:
        G = "Lending rules (fair lending and NMLS)"
        fh = scan(FH_FAIL + FAIR_LENDING, mains)
        R.add(G, "Fair lending language", "pass" if not fh else "fail",
              "; ".join('"%s": %s' % (h["phrase"], h["why"]) for h in fh[:5]), count=len(fh), pages=uniq_pages(fh),
              why="The Fair Housing Act and ECOA apply to lending ads too: describe loans, never who should apply.")
        ln = scan(LENDING, mains)
        R.add(G, "Lending claims", "pass" if not ln else "fail",
              "; ".join('"%s": %s' % (h["phrase"], h["why"]) for h in ln[:5]), count=len(ln), pages=uniq_pages(ln))
        bare = lambda p: BRACKET.sub(" ", p["visible"])
        blank = lambda ps, word: ps and all(re.search(r"\[[^\]]{0,200}" + word, p["visible"], re.I) for p in ps)
        nm = [p for p in ok if not re.search(r"\bNMLS\s*(#|ID|No\.?)?\s*:?\s*\d{3,}", bare(p), re.I)]
        co = [p for p in ok if len(re.findall(r"\bNMLS\s*(?:#|ID|No\.?)?\s*:?\s*\d{3,}", bare(p), re.I)) < 2]
        ehl = [p for p in ok if not re.search(r"equal housing (lender|opportunity)", p["visible"], re.I)]
        R.add(G, "NMLS number on every page", "pass" if not nm else ("todo" if blank(nm, "nmls") else "fail"),
              ("Missing on %d of %d pages" % (len(nm), len(ok)) if nm else "All %d pages" % len(ok)) + ("; the blank for it is there, waiting for your number" if blank(nm, "nmls") else ""), pages=paths(nm),
              why="Federal and state rules require the NMLS number on mortgage advertising, including websites.")
        R.add(G, "Company NMLS number on every page", "pass" if not co else ("todo" if blank(co, "company nmls") else "fail"),
              ("Missing on %d of %d pages" % (len(co), len(ok)) if co else "All %d pages" % len(ok)) + ("; the blank for it is there, waiting for the number" if blank(co, "company nmls") else ""), pages=paths(co))
        R.add(G, "Equal Housing Lender on every page", "pass" if not ehl else "fail", ("Missing on %d of %d pages" % (len(ehl), len(ok)) if ehl else "All %d pages" % len(ok)), pages=paths(ehl))

    # ---- 6c. Trade rules (packs.py: the service seeds' compliance packs)
    rules = packs.rules_for(industry, state)
    G = "Advertising rules (%s)" % rules["label"] if rules["label"] else "Advertising basics (FTC)"
    base_hits = scan(rules["warn"][:len(packs.BASELINE["warn"]) + (0 if re_profile else 1)], mains)
    R.add(G, "Offers and disclaimers", "pass" if not base_hits else "warn",
          "; ".join('"%s": %s' % (h["phrase"], h["why"]) for h in base_hits[:4]), count=len(base_hits), pages=uniq_pages(base_hits))
    if rules["label"]:
        trade_warn = scan(rules["warn"][len(packs.BASELINE["warn"]) + (0 if re_profile else 1):], mains)
        R.add(G, "Claims this trade must be careful with", "pass" if not trade_warn else "warn",
              "; ".join('"%s": %s' % (h["phrase"], h["why"]) for h in trade_warn[:5]), count=len(trade_warn), pages=uniq_pages(trade_warn),
              fix="Read each listed phrase against its rule; reword or be ready to prove it.")
        if rules["fail"]:
            trade_fail = scan(rules["fail"], mains)
            R.add(G, "Claims %s does not allow" % (state or "the state"), "pass" if not trade_fail else "fail",
                  "; ".join('"%s": %s' % (h["phrase"], h["why"]) for h in trade_fail[:5]), count=len(trade_fail), pages=uniq_pages(trade_fail),
                  fix="Remove each listed phrase; these are prohibited outright in %s." % (state or "this state"))
        for pat, what in rules["every_page"]:
            miss = [p for p in ok if not re.search(pat, BRACKET.sub(" ", p["visible"]), re.I)]
            R.add(G, "On every page: %s" % what.split(" (")[0], "pass" if not miss else "fail",
                  "%s. Required: %s" % (("Missing on %d of %d pages" % (len(miss), len(ok))) if miss else "All %d pages" % len(ok), what), pages=paths(miss),
                  fix="Put it in the footer so it shows on every page.")
        for c in rules["conditional"]:
            says = [p for p in ok if re.search(c["if_page"], p["visible"], re.I)]
            has_num = any(re.search(packs.LICENCE_NUMBER, BRACKET.sub(" ", p["visible"]), re.I) for p in ok)
            if says:
                R.add(G, "Licence number shown where the site says licensed", "pass" if has_num else "warn",
                      "" if has_num else c["why"], pages=paths(says) if not has_num else [],
                      fix="Show the licence number in the footer.")
        if rules["state_covered"] is False:
            R.add(G, "State rules for this trade", "notMeasured",
                  ("%s's rules for this trade have not been verified, so they were not checked" % state) if state
                  else "No state given or found on the site, so state rules were not checked",
                  fix="")

    # ---- 7. Privacy
    G = "Privacy"
    found_trackers = set()
    for p in ok:
        blob = " ".join(p["scripts"]) + " " + p["raw"][:400000]
        for name, sig, _ in TRACKERS:
            if re.search(sig, blob, re.I):
                found_trackers.add(name)
    # Follow the site's own privacy link first; guess the usual addresses after.
    priv_links = sorted({u for p in ok for u in p["internal"] if u != "__unsafe__" and "privacy" in pathof(u).lower()})
    priv_status, priv = 0, ""
    for cand in priv_links[:2] + [urljoin(home, "/privacy")]:
        priv_status, _, priv = fetch(cand)
        if priv_status == 200:
            break
    if priv_status != 200:
        for alt in ("/privacy-policy", "/privacy-policy/", "/legal/privacy"):
            priv_status, _, priv = fetch(urljoin(home, alt))
            if priv_status == 200:
                break
    has_priv = priv_status == 200 and len(priv) > 500 and re.search(r"privacy", priv, re.I)
    R.add(G, "Privacy policy page", "pass" if has_priv else "fail", "" if has_priv else "Required in California for any site that collects names or emails")
    if found_trackers:
        pparse = PageParser()
        try:
            pparse.feed(priv or "")
        except Exception:
            pass
        ptext = norm_space(" ".join(pparse.texts))[:300000]
        sentences = re.split(r"(?<=[.!?])\s+", ptext)
        undisclosed = [name for name, _, vend in TRACKERS if name in found_trackers and not any(re.search(vend, s, re.I) and TRACK_WORDS.search(s) for s in sentences)]
        R.add(G, "Tracking tools disclosed", "pass" if not undisclosed else "fail",
              "Uses %s%s" % (", ".join(sorted(found_trackers)), "; not mentioned in the privacy policy: " + ", ".join(undisclosed) if undisclosed else ""))

    # ---- 7b. The software behind the site: PHP and the site builder (security.py)
    G = "Security of the software behind the site"
    # Scored rows exist only for what the site states outright; everything else is the
    # "What your site is built on" box (platform, never graded) and "Not measured" below.
    sec_checks, platform = security.assess(headers, ok)
    for nm, st, detail, why, fix in sec_checks:
        R.add(G, nm, st, detail, why=why, fix=fix)

    # ---- 7c. Security score, ownership, email trust, AI readiness, looked-after (security.py)
    trust = trust_gather(home, host, headers, ok[0]["raw"], platform, ok, local, datetime.now(), public=public)
    for c in trust["checks"]:
        R.add(c["group"], c["name"], c["status"], c["detail"], count=c.get("count"), why=c["why"], fix=c["fix"], owner=c.get("owner"))

    # ---- 8. Not measured, said out loud
    G = "Not measured here"
    if platform.get("php") and not platform.get("phpVersion"):
        R.add(G, "Your PHP version", "notMeasured",
              "The site does not show it (that is good practice), so whether it has the 21 Oct 2026 PHP security fix is "
              "not known from the outside.", fix="")
    if "Elementor Pro" in (platform.get("builders") or []) and not any(c[0].endswith("Elementor Pro") for c in sec_checks):
        R.add(G, "Elementor Pro's version", "notMeasured",
              "The site hides it, so we could not tell whether it has the fix for CVE-2026-32475 (version 4.2.2 or newer).", fix="")
    if platform.get("platform") == "WordPress":
        R.add(G, "Every WordPress plugin's own updates", "notMeasured",
              "WordPress plugins get hundreds of new security flaws a week; only the critical, attacked ones on our "
              "list (updated %s) were checked." % security.LIST_UPDATED, fix="")
    for nm, why in (("Dark-mode contrast", "whether text stays readable when a phone is in dark mode; needs a person or a full browser session to check"),
                    ("Overlapping text", "whether words run into each other on small screens; look at the phone picture"),
                    ("Keyboard focus rings", "whether someone using a keyboard can see where they are on the page"),
                    ("Real visitors' speed", "how fast it is for real visitors over weeks, which only Google Search Console knows")):
        R.add(G, nm, "notMeasured", why, fix="")
    for line in rules["not_checked"]:
        R.add(G, line.split(":")[0].split(".")[0][:70], "notMeasured", line, fix="")
    if walled:
        R.add(G, "Pages the site's bot shield refused", "notMeasured",
              "%d page%s answered with a security check instead of the page%s" % (walled, "s" if walled != 1 else "", "; reading stopped early to stay polite" if in_a_row >= 3 else ""), fix="")
    if refused:
        R.add(G, "Links the site refused to let us check", "notMeasured",
              "%d link%s refused an automated check; not counted as broken" % (refused, "s" if refused != 1 else ""), fix="")
    if len(pages) >= MAX_PAGES:
        R.add(G, "Pages beyond the first %d" % MAX_PAGES, "notMeasured",
              "A sample of %d pages was read, spread across the sitemap, to stay polite to the site" % MAX_PAGES, fix="")
    if out_of_time:
        R.add(G, "Pages and links past the time limit", "notMeasured",
              "This site answered slowly, so the check stopped after %d pages and %d links to finish in time; "
              "the rest were not read" % (len(pages), len(to_check)), fix="")

    # ---- scores
    groups = []
    for c in R.checks:
        if c["group"] not in groups:
            groups.append(c["group"])
    weight = {"pass": 1.0, "local": 1.0, "todo": 1.0, "warn": 0.5, "fail": 0.0}
    categories = []
    for g in groups:
        if g == "Not measured here":
            continue
        cs = [c for c in R.checks if c["group"] == g and c["status"] in weight]
        if g.startswith("Google's own test"):
            # Google's test with no scores: left out (None) unless the page itself is broken,
            # when its four scores count as failures (0). See THE GRADE, IN ONE PLACE.
            vals = [lh.get(k) for k in names if lh.get(k) is not None]
            score = round(sum(vals) / len(vals)) if vals else (0 if lh_failed else None)
        else:
            score = round(100 * sum(weight[c["status"]] for c in cs) / len(cs)) if cs else None
        counts = {s: sum(1 for c in R.checks if c["group"] == g and c["status"] == s) for s in ("pass", "warn", "fail", "local", "todo", "notMeasured")}
        categories.append({"name": g, "score": score, "counts": counts})
    # The five trust areas (security score, ownership, email, AI readiness, looked after) are shown one by one but
    # count as ONE area of the grade together: one missing DNS record must not cost a letter. Owner decision pending
    # on the weight; this keeps the grade of every older check where it was.
    vals = [c["score"] for c in categories if c["score"] is not None and c["name"] not in security.TRUST_GROUPS]
    trust_vals = [c["score"] for c in categories if c["score"] is not None and c["name"] in security.TRUST_GROUPS]
    if trust_vals:
        vals.append(round(sum(trust_vals) / len(trust_vals)))
    raw_overall = round(sum(vals) / len(vals)) if vals else None
    below_bar = [k for k in names if lh.get(k) is not None and lh.get(k) < BAR[k]
                 and not (local and k == "seo" and all(f["id"] in ("is-crawlable", "canonical") for f in lh.get("seoFailed", [])))]
    if lh_failed:
        below_bar = list(names)  # counted as 0, so under every launch floor
    shortfall = google_shortfall(lh, below_bar)
    overall = None if raw_overall is None else max(0, round(raw_overall - shortfall))

    totals = {s: sum(1 for c in R.checks if c["status"] == s) for s in ("pass", "warn", "fail", "local", "todo", "notMeasured")}
    return {
        "url": home, "label": label, "profile": industry, "industry": industry, "industryAuto": industry_auto,
        "industryWhy": industry_why, "who": who_label, "tradeRules": rules["label"], "state": state, "stateSource": state_src,
        "local": local, "reachable": True,
        "measuredAt": datetime.now().isoformat(timespec="minutes"), "seconds": round(time.time() - started),
        "overall": overall, "letter": letter(overall), "belowBar": below_bar,
        "averageBeforeGoogle": raw_overall, "googleShortfall": round(shortfall, 1),
        "categories": categories, "checks": R.checks, "totals": totals,
        "caps": {"pages": MAX_PAGES, "links": MAX_LINKS},
        "lighthouse": {k: lh.get(k) for k in LH_KEYS},
        "lighthouseSource": lh.get("_source"), "screenshot": lh.get("screenshot"), "lighthouseLog": lh.get("_log"), "lighthouseError": lh.get("_error") if lh.get("performance") is None else None,
        "lighthouseLimit": lh.get("_limit"),
        "lighthouseUnavailable": lh_unavailable,
        "bar": dict(BAR),
        "platform": platform,  # "What your site is built on": read-only, never part of the grade
        "redFlags": security.red_flags(R.checks, platform, trade_sure=not industry_why.startswith(INDUSTRY_GUESSED)),  # what to worry about; never part of the grade
        "facts": {"pagesChecked": len(pages), "pagesOk": len(ok), "linksChecked": len(to_check),
                  "pagesWithSchema": len(ok) - len(no_ld), "brokenPages": broken_pages, "brokenLinks": broken_links[:20],
                  "sitemapPages": len(sm_pages), "trackers": sorted(found_trackers), "certificate": STATE["cert"] or "ok",
                  "ownership": trust["ownership"]},
        "pages": [{"path": p["path"], "status": p["status"], "title": p["title"], "types": p["types"]} for p in pages],
    }


# THE GRADE, IN ONE PLACE
# The grade is a number: the average of the category scores, 0 to 100, minus points for
# Google's test (google_shortfall): every point a Google score falls below its launch target
# (BAR) costs a quarter point. Google's four scores are only one category of about ten, so on
# their own a 40-point accessibility drop moved the grade 2 points; the shortfall makes it count.
# (Owner decision 2026-10-26. Before it, a site under any target was held to exactly 89, so every
# strong site read 89 whatever it was.) The letter is read off the number here and nowhere else:
#   90-100 A   80-89 B   70-79 C   60-69 D   0-59 F
# Number and letter can never disagree, because the letter is derived from the number.
# Every surface (report, web page, command line) shows both, number and letter together.
#
# WHEN GOOGLE'S TEST HAS NO SCORES (owner decision, 2026-10-19)
# lighthouse_unavailable() says WHY, from evidence: Lighthouse's own verdict (runtimeError
# code, the status the page answered it with), what happened to our checker (no browser,
# out of time, skipped), and our own plain read of the same home page. First match wins:
#
#   cause          evidence                                               grade effect
#   skipped        the check was run with Lighthouse turned off           left out
#   no-browser     no Chrome, Edge or Chromium on the computer running it left out
#   not-launched   --local, a private address, or a "coming soon" /       left out
#                  "under construction" page
#   blocked        our plain read was refused by a bot shield, OR          left out
#                  Lighthouse got 401/403/429 or a challenge page while
#                  the site served our plain read
#   site-broken    our plain read ALSO found the page broken (no answer,   FAILED: each of
#                  an error status, empty, not a web page, or no words     the four scores
#                  until JavaScript runs) AND Lighthouse failed on the     counts as 0, and
#                  page itself (NO_FCP, PAGE_HUNG, ERRORED_DOCUMENT_       so is under every
#                  REQUEST, NOT_HTML, ...; a timeout counts only when the  launch floor
#                  plain read got no page at all)
#   timeout        Lighthouse or our checker ran out of time, the plain    left out
#                  read loaded fine (bakerroofing.com, 2026-10-18)
#   checker-page   Lighthouse failed on the page but the plain read        left out
#                  loaded it fine: ambiguous, so never held against it
#   checker        anything else (Node missing, PageSpeed refused,         left out
#                  deployment protection, ...)
#
# "Left out" means the category has no score and the grade is the average of the rest.
# A site is only ever marked down for Google's test when two independent reads agree its
# page is broken for real visitors. Every cause has its own plain-English reason, shown in
# the report and the result; there is no silent "pending".


# Lighthouse runtimeError codes that mean the page itself did not load (Lighthouse 12).
LH_PAGE_CODES = {"NO_FCP", "PAGE_HUNG", "ERRORED_DOCUMENT_REQUEST", "FAILED_DOCUMENT_REQUEST", "NOT_HTML",
                 "NO_DOCUMENT_REQUEST", "NO_RESOURCE_REQUEST", "DNS_FAILURE", "CHROME_INTERSTITIAL_ERROR",
                 "INSECURE_DOCUMENT_REQUEST", "PROTOCOL_TIMEOUT"}
LH_TIMEOUT_CODES = {"PAGE_HUNG", "PROTOCOL_TIMEOUT"}
LH_TIMEOUT_WORDS = re.compile(r"timed? ?out|TimeoutError|TimeoutExpired|had not finished|still running", re.I)
LH_PLAIN = {
    "NO_FCP": "the page never showed anything on screen",
    "PAGE_HUNG": "the page stopped responding while it loaded",
    "FAILED_DOCUMENT_REQUEST": "the page could not be loaded at all",
    "NOT_HTML": "the address sent back something that is not a web page",
    "NO_DOCUMENT_REQUEST": "the page did not load",
    "NO_RESOURCE_REQUEST": "the page did not load",
    "DNS_FAILURE": "the site's address could not be found",
    "CHROME_INTERSTITIAL_ERROR": "the browser showed a warning page instead of the site",
    "INSECURE_DOCUMENT_REQUEST": "the browser refused the page's security certificate",
    "PROTOCOL_TIMEOUT": "the page stopped responding while it loaded",
}
CRAWL_PLAIN = {"no-answer": "did not answer at all", "broken": "answered with an error", "empty": "sent back an empty page",
               "not-html": "sent back something that is not a web page", "no-words": "showed no words until JavaScript ran"}
# Our checker's own failures, in plain words (the raw error is kept in lighthouseSaid).
CHECKER_PLAIN = (
    (r"Execution context was destroyed|Target closed|Session closed|Connection closed|Protocol error|crashed", "the browser lost the page partway through"),
    (r"deployment protection", "our checker could not reach its own copy of Google's test"),
    (r"Node is not installed", "a program it needs, Node, is not installed on this computer"),
    (r"PageSpeed", "Google's PageSpeed service did not give an answer"),
    (r"dependency load failed|returned nothing|connect to Chrome|debugging port", "our copy of Google's test did not start"),
    (r"characters Windows", "the address has characters it cannot pass safely"),
    (r"Windows", "a Windows limit on running it from here"),
)
LH_BROKEN_FIX = ("Open the home page in a normal browser on a phone, find what stops it loading (the reason above), "
                 "fix it with whoever maintains the site, then run this check again.")


def _plain_text(s):
    """Lighthouse's and our own words, safe for the report: no em or en dashes, one line."""
    return re.sub(r"\s+", " ", re.sub(r"\s*[—–]\s*", ", ", str(s or ""))).strip()[:300]


def lighthouse_unavailable(lh, crawl, graded=True):
    """Why Google's test has no scores, or None when it has any. The decision table is above.

    lh:     the Lighthouse result dict (scores plus _error, _runtimeCode, _docStatus,
            _noBrowser, _timeout, _skipped). crawl: our plain read of the same home page,
            {"home": "ok"|"blocked"|"broken"|"empty"|"no-answer"|"not-html", "status": int,
            "noWords": bool, "notLaunched": bool}. graded: whether this report has a grade.
    Returns {"cause", "side", "effect": "excluded"|"failed", "reason", "lighthouseSaid"}."""
    if any(lh.get(k) is not None for k in LH_SCORES):
        return None
    code = (lh.get("_runtimeCode") or "").upper()
    doc = lh.get("_docStatus")
    err = lh.get("_error") or ""
    said = _plain_text(lh.get("_runtimeMsg") or "")
    page_error = code in LH_PAGE_CODES
    timed_out = bool(lh.get("_timeout")) or code in LH_TIMEOUT_CODES or bool(LH_TIMEOUT_WORDS.search(err))
    home = crawl.get("home") or "ok"
    crawl_failed = home in ("no-answer", "broken", "empty", "not-html")
    if code == "ERRORED_DOCUMENT_REQUEST" and doc:
        plain = "the page answered with error %d" % doc
    else:
        plain = LH_PLAIN.get(code) or "the page would not load"

    if lh.get("_skipped"):
        cause, side = "skipped", "checker"
        core = "Google's test was turned off for this check, so it did not run."
    elif lh.get("_noBrowser"):
        cause, side = "no-browser", "checker"
        core = ("We could not run Google's test because there is no Chrome browser on this computer. Install Google Chrome "
                "(free, from google.com/chrome) and run the check again to get these four scores.")
    elif crawl.get("notLaunched"):
        cause, side = "not-launched", "not-launched"
        core = "This site is not launched yet, and Google's test applies after launch."
    elif lh.get("_challenge"):
        # Lighthouse scored the shield's check page instead of the site; read_lighthouse threw those scores away.
        cause, side = "blocked", "checker"
        who = lh["_challenge"]
        core = ("The site's security service%s showed our checker a security check page instead of the site, so Google's "
                "test could only score that check page. Those scores were thrown away and are not shown. That is the site "
                "protecting itself, and it does not affect real visitors."
                % ("" if who == "a security service" else " (%s)" % who))
    elif home == "blocked" or doc in (401, 403, 429) or BOT_WALL.search(said + " " + err):
        cause, side = "blocked", "checker"
        core = ("The site's security service turned our checker away%s, so Google's test could not load the page. That is the "
                "site protecting itself, and it does not affect real visitors."
                % ((" (error %d)" % doc) if doc in (401, 403, 429) else ""))
    elif (crawl_failed and (page_error or timed_out)) or (crawl.get("noWords") and page_error):
        cause, side = "site-broken", "site"
        core = ("Google's test could not load this page: %s. Our own plain read of the page %s too, so real visitors are "
                "likely hitting the same problem, and it needs fixing."
                % (plain, CRAWL_PLAIN["no-words" if home == "ok" else home]))
    elif timed_out:
        cause, side = "timeout", "checker"
        core = ("Google's test timed out in our checker before it finished. The page loaded normally when we read it, so this "
                "is not held against the site. Running the check again often gets the scores.")
    elif page_error:
        cause, side = "checker-page", "checker"
        core = ("Google's test could not load the page in our checker (%s), but the page loaded normally when we read it. That "
                "points at our checker, not the site, so it is not held against the site. Running the check again often gets "
                "the scores." % plain)
    else:
        cause, side = "checker", "checker"
        # The raw error goes in lighthouseSaid for whoever fixes the checker; the owner reads plain words.
        said = said or _plain_text(err) or ""
        what = next((p for pat, p in CHECKER_PLAIN if re.search(pat, err, re.I)), "it stopped with an error")
        core = ("Google's test could not run in our checker this time (%s). That is a problem on our side, not the site's. "
                "Running the check again often gets the scores." % what)
    effect = "failed" if side == "site" else "excluded"
    if not graded:
        tail = ""
    elif effect == "failed":
        tail = " Until it is fixed, these four scores count as failures in the grade."
    elif cause == "not-launched":
        tail = " These four scores are left out of the grade until the site is live."
    else:
        tail = " These four scores are left out of the grade, which covers everything else that was measured."
    return {"cause": cause, "side": side, "effect": effect, "reason": core + tail, "lighthouseSaid": said or None}


SHORTFALL_RATE = 0.25  # points off the grade per point a Google score is under its target


def google_shortfall(lh, below_bar):
    """Points off the grade for Google's test: a quarter point for every point a measured score
    falls under its launch target. A score that was not measured costs nothing here (a broken
    page already counts its scores as 0 in the average)."""
    return sum(BAR[k] - lh[k] for k in below_bar if isinstance(lh.get(k), (int, float))) * SHORTFALL_RATE


def letter(score):
    if score is None:
        return "?"
    for cut, l in ((90, "A"), (80, "B"), (70, "C"), (60, "D")):
        if score >= cut:
            return l
    return "F"
