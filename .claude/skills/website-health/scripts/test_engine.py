#!/usr/bin/env python3
"""
Try to break the website health check, with no internet needed.

    python3 test_engine.py            # every case below; exit code = number of failures
    python3 test_engine.py --lighthouse   # also run Google Lighthouse on the clean site

Each fake site is served from this computer (127.0.0.1) and was built to trip
specific checks, or to trip none. A case passes only when the grader says
exactly what a person checking by hand would say. Also covers the visual
report (escaping hostile content) and the command line.
"""
from __future__ import annotations

import gzip
import json
import os
import re
import shutil
import ssl
import subprocess
import sys
import tempfile
import threading
import time
import zlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import grader  # noqa: E402
import report_html  # noqa: E402
import security  # noqa: E402

grader.PAUSE = 0  # our own server: no need to be polite
grader.READ_SECONDS = 3  # the slow-drip page would otherwise take the real 30 seconds per read


def _bomb():
    c = zlib.compressobj(9, zlib.DEFLATED, 16 + zlib.MAX_WBITS)
    chunk = b"\0" * (1 << 20)
    return b"".join(c.compress(chunk) for _ in range(1024)) + c.flush()


BOMB = _bomb()
FAILS = []


def step(name, ok, detail=""):
    print("%s  %s%s" % ("PASS" if ok else "FAIL", name, ("  -- " + str(detail)[:2000]) if (detail and not ok) else ""), flush=True)
    if not ok:
        FAILS.append(name)


# ------------------------------------------------------------------ fake sites
def page(title, body, desc="A clear description of this page that is long enough to count, about sixty characters.",
         ld=None, extra_head="", lang="en", h1=None, canonical=True, path="/"):
    ld_html = "".join('<script type="application/ld+json">%s</script>' % (x if isinstance(x, str) else json.dumps(x)) for x in (ld or []))
    nav = '<nav><a href="/">Home</a> <a href="/about">About</a> <a href="/services">Services</a> <a href="/faq">FAQ</a> <a href="/contact">Contact</a> <a href="/privacy">Privacy</a></nav>'
    return ('<!doctype html><html lang="%s"><head><meta charset="utf-8"><title>%s</title>'
            '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="%s">'
            '<meta property="og:title" content="%s"><meta property="og:image" content="{origin}/og.jpg">%s%s%s</head>'
            '<body>%s<main><h1>%s</h1>%s</main><footer>%s</footer></body></html>') % (
        lang, title, desc, title, ('<link rel="canonical" href="{origin}%s">' % path) if canonical else "", extra_head, ld_html,
        nav, h1 or title, body, "")


BIZ = {"@context": "https://schema.org", "@type": "LocalBusiness", "@id": "{origin}/#biz", "name": "Cedar Lane Bakery",
       "address": {"@type": "PostalAddress", "addressRegion": "OR"}}
FAQ = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
    {"@type": "Question", "name": "Do you bake on Sundays?", "acceptedAnswer": {"@type": "Answer", "text": "Yes, from eight."}}]}
PROSE = ("We bake bread every morning from local flour and sell it until it runs out. Our counter opens at seven, "
         "and the sourdough comes out of the oven at eight. We take orders for birthdays and weddings with a week of notice. ")


def clean_site():
    paths = {"/": "Cedar Lane Bakery in Portland, Oregon", "/about": "About Cedar Lane Bakery and our bakers",
             "/services": "Cakes, bread and catering at Cedar Lane", "/faq": "Questions about Cedar Lane Bakery",
             "/contact": "Contact Cedar Lane Bakery in Portland", "/privacy": "Privacy policy for Cedar Lane Bakery"}
    bodies = {"/": PROSE * 2, "/about": "Our three bakers trained in Lyon and Portland. " * 12,
              "/services": "Sourdough loaves, rye, seeded rolls, layer cakes and catering trays for offices. " * 10,
              "/faq": "<h2>Do you bake on Sundays?</h2><p>Yes, from eight.</p>" + "<p>Ask us about allergens and ingredients any day.</p>" * 8,
              "/contact": "Call the shop or write to us using the form. We answer within a day. " * 10,
              "/privacy": "This privacy policy explains what we collect when you order a cake and how long we keep it. " * 12}
    site = {}
    for p, t in paths.items():
        ld = [BIZ] + ([FAQ] if p == "/faq" else [])
        site[p] = (200, {"Content-Type": "text/html; charset=utf-8"}, page(t, "<p>%s</p>" % bodies[p], ld=ld, path=p))
    site["/robots.txt"] = (200, {"Content-Type": "text/plain"}, "User-agent: *\nAllow: /\nSitemap: {origin}/sitemap.xml\n")
    site["/sitemap.xml"] = (200, {"Content-Type": "application/xml"}, "<urlset>%s</urlset>" % "".join("<url><loc>{origin}%s</loc></url>" % p for p in paths))
    site["/llms.txt"] = (200, {"Content-Type": "text/plain"}, "# Cedar Lane Bakery\nA neighborhood bakery in Portland, Oregon. Bread, cakes, catering.\n")
    return site


def messy_site():
    icons = '<svg><title>Facebook</title><path d=""/></svg><svg><title>Chevron Right</title></svg>'
    dup = ("Our movers arrive early with blankets, dollies and a written inventory of every room. We wrap furniture "
           "before it leaves the house, label each box by floor, and photograph anything fragile so nothing is argued "
           "about later. Pianos, safes and gun cabinets get their own crew and a separate quote. Most local moves "
           "finish the same day; long-distance loads ride in a sealed trailer that is opened only at your new door. "
           "You get one coordinator from the first call to the last box, and a text when the truck is twenty minutes "
           "out. Storage is available by the week in a climate-controlled warehouse near the highway. We do not charge "
           "for stairs, elevators or long carries, and the price on the estimate is the price on the invoice. ")
    bad_ld = '{"@context":"https://schema.org","@type":"LocalBusiness",'  # broken JSON
    dangling = {"@context": "https://schema.org", "@type": "LocalBusiness", "name": "X", "parentOrganization": {"@id": "#missing"}}
    hidden_faq = {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "Is this question hidden from visitors?"}]}
    site = {
        "/": (200, {"Content-Type": "text/html"},
              '<!doctype html><html><head><title>Hi</title>%s<script src="https://connect.facebook.net/en_US/fbevents.js"></script></head><body>'
              '<a href="/a">A</a><a href="/b">B</a><a href="javascript:alert(1)">Run</a><a href="/missing">Dead</a>'
              '<h1>One</h1><h1>Two</h1><p>Lorem ipsum dolor sit amet. We are the #1 agent in Springfield, guaranteed results. '
              'Call (555) 010-2000. Your name here: [Your Name]. When it comes to service — we leverage synergy.</p>'
              '<img src="x.jpg"><img src="y.jpg" alt=""></body></html>' % icons),
        "/a": (200, {"Content-Type": "text/html"}, '<html lang="en"><head><title>Page A about moving services</title>'
               '<script type="application/ld+json">%s</script><script type="application/ld+json">%s</script></head><body><main><h1>A</h1><p>%s</p></main></body></html>'
               % (bad_ld, json.dumps(dangling), dup)),
        "/b": (200, {"Content-Type": "text/html"}, '<html lang="en"><head><title>Page B about moving services</title>'
               '<script type="application/ld+json">%s</script></head><body><main><h1>B</h1><p>%s</p></main></body></html>' % (json.dumps(hidden_faq), dup)),
        "/robots.txt": (200, {"Content-Type": "text/plain"}, "User-agent: *\nDisallow: /\n"),
        "/privacy": (200, {"Content-Type": "text/html"}, "<html><body><p>" + "We respect your privacy and use Google to measure visits with cookies. " * 20 + "</p></body></html>"),
    }
    return site


def realtor_site():
    foot = "Jane Doe, Realtor. Sunrise Realty brokerage. DRE #00000000."
    ld = [{"@context": "https://schema.org", "@graph": [{"@type": "RealEstateAgent", "@id": "{origin}/#agent", "name": "Jane Doe"},
                                                         {"@type": "Organization", "name": "Sunrise Realty"}, {"@type": "WebSite", "name": "Jane"},
                                                         {"@type": "Person", "name": "Jane Doe"}]}]
    site = {
        "/": (200, {"Content-Type": "text/html"}, page("Jane Doe, Realtor in Sacramento homes", "<p>The #1 agent in town. A family-friendly neighborhood and a safe area with great schools. "
              "Standard commission applies. Homes for sale near the river.</p><p>%s Equal Housing Opportunity.</p>" % foot, ld=ld)),
        "/about": (200, {"Content-Type": "text/html"}, page("About Jane Doe, Sacramento realtor", "<p>Twenty years selling homes for sale in Sacramento as a listing agent.</p><p>%s</p>" % foot, ld=ld, path="/about")),
        "/contact": (200, {"Content-Type": "text/html"}, page("Contact Jane Doe, Sacramento realtor", "<p>Call me about homes for sale. Write anytime.</p>", ld=ld, path="/contact")),
    }
    return site


def lender_site():
    ld = [{"@context": "https://schema.org", "@type": "LocalBusiness", "name": "Rate Co"}]
    return {"/": (200, {"Content-Type": "text/html"}, page("Rate Co mortgage loans in Austin, Texas",
            "<p>Mortgage rates as low as 5.9% APR. Payments as low as $1,200/mo. Guaranteed approval and no credit check! "
            "Talk to a loan officer about refinancing. Refinance today with a mortgage loan. NMLS #000000.</p>", ld=ld)),
            "/contact": (200, {"Content-Type": "text/html"}, page("Contact Rate Co loan officers", "<p>Mortgage loan help. NMLS 000000.</p>", ld=ld, path="/contact"))}


def dentist_site():
    ld = [{"@context": "https://schema.org", "@type": "Dentist", "name": "Smile Studio",
           "address": {"@type": "PostalAddress", "addressRegion": "California"}}]
    return {"/": (200, {"Content-Type": "text/html"}, page("Smile Studio, dentist in San Diego, California",
            "<p>Painless cleanings and the best dentist in San Diego. See our before and after gallery. Results may vary.</p>", ld=ld)),
            "/contact": (200, {"Content-Type": "text/html"}, page("Contact Smile Studio in San Diego", "<p>Book a visit.</p>", ld=ld, path="/contact"))}


def contractor_site():
    ld = [{"@context": "https://schema.org", "@type": "Plumber", "name": "Pipe Pros",
           "address": {"@type": "PostalAddress", "addressRegion": "CA"}}]
    return {"/": (200, {"Content-Type": "text/html"}, page("Pipe Pros plumbing in Fresno, California",
            "<p>Licensed and insured plumbers. Free estimates on water heaters.</p>", ld=ld))}


def spa_site():
    return {"/": (200, {"Content-Type": "text/html"}, '<!doctype html><html lang="en"><head><title>App that needs JavaScript</title>'
            '<script src="/bundle.js"></script></head><body><div id="root"></div><noscript>You need to enable JavaScript to run this app.</noscript></body></html>')}


def botwall_site():
    return {"/": (403, {"Content-Type": "text/html", "Server": "cloudflare", "cf-mitigated": "challenge"},
            "<html><head><title>Just a moment...</title></head><body><script src='/cdn-cgi/challenge-platform/x.js'></script></body></html>")}


def sg_shield_site():
    # SiteGround's anti-bot page, answering 200, as the web checker got it for nashvilleroofingco.com (2026-10-26).
    return {"/": (200, {"Content-Type": "text/html"},
            '<html><head><title>Bot Verification</title><meta http-equiv="refresh" content="0;/.well-known/sgcaptcha/?r=%2F"></head>'
            "<body>Verifying that you are not a robot...</body></html>")}


def shield_title_shield_less_site():
    # Same shield title wording, no shield marker: decided by the title and how few words there are.
    return {"/": (200, {"Content-Type": "text/html"},
            "<html><head><title>Just a moment...</title></head><body><p>Please wait while we check your browser.</p></body></html>")}


def real_page_with_shield_words_site():
    # A real business page that happens to be titled like a shield: it has words, so it is read and graded.
    return {"/": (200, {"Content-Type": "text/html"}, page("Security Check Services | Nashville home inspections",
            "<p>" + "We run a full security check of your home, doors, locks and alarms, and send a written report. " * 12 + "</p>"))}


def encoding_site():
    body = page("Café Français in Québec, a small cafe", "<p>" + "Crème brûlée et café au lait chaque matin. " * 10 + "</p>").replace('charset="utf-8"', 'charset="iso-8859-1"')
    return {"/": (200, {"Content-Type": "text/html; charset=iso-8859-1", "Content-Encoding": "gzip"}, ("GZ", body.encode("iso-8859-1")))}


def hostile_site():
    t = '</title><script>alert("t")</script>'
    return {"/": (200, {"Content-Type": "text/html"}, '<html><head><title>Evil %s</title></head><body><main><h1>x</h1>'
            '<p>We are #1 <img src=x onerror=alert(1)> "best agent in Town" </p><a href="/%%22%%3E%%3Cscript%%3Ealert(2)%%3C/script%%3E">x</a></main></body></html>' % t)}


def big_sitemap_site():
    site = {"/": (200, {"Content-Type": "text/html"}, page("A site with a thousand pages to read", "<p>%s</p>" % PROSE))}
    site["/sitemap.xml"] = (200, {"Content-Type": "application/xml"}, "<urlset>%s</urlset>" % "".join("<url><loc>{origin}/p%d</loc></url>" % i for i in range(1000)))
    for i in range(1000):
        site["/p%d" % i] = (200, {"Content-Type": "text/html"}, page("Page number %d of the big site" % i, "<p>Page %d. %s</p>" % (i, PROSE), path="/p%d" % i))
    return site


def thin_sitemap_site():
    site = clean_site()
    site["/sitemap.xml"] = (200, {"Content-Type": "application/xml"}, "<urlset><url><loc>{origin}/</loc></url></urlset>")
    return site


def nasty_site():
    """Everything a hostile or sloppy site can throw at the checker at once."""
    site = clean_site()
    site["/robots.txt"] = (200, {"Content-Type": "text/plain"},
                           "User-agent: *\nAllow: /\nSitemap: sitemap.xml\nSitemap: http://127.0.0.1:1/admin\nSitemap: ftp://x/y\n\n"
                           "User-agent: GPTBot\nDisallow: /\n" + "\n" * 200000)
    home = site["/"][2]
    junk = ('<a href="//[x">bad</a><![x[ broken ]]><a href="/bomb">b</a><a href="/drip">d</a><a href="/to-ftp">f</a>'
            '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Thing","@id":["x"],"about":{"@id":{}}}</script>')
    site["/"] = (200, site["/"][1], home.replace("</main>", junk + "</main>"))
    site["/sitemap.xml"] = (200, {"Content-Type": "application/xml"}, site["/sitemap.xml"][2].replace("</urlset>",
                            "<url><loc>http://[x</loc></url><url><loc>{origin}/regex</loc></url><url><loc>{origin}/lend</loc></url>"
                            "<url><loc>{origin}/bomb</loc></url><url><loc>{origin}/drip</loc></url></urlset>"))
    site["/regex"] = (200, {"Content-Type": "text/html"}, "<html><head><title>Regex bomb page here</title></head><body><main><p>"
                      + "<" * 300000 + "<script>" * 30000 + "[A" * 50000 + "free " * 20000 + "</p></main></body></html>")
    site["/lend"] = (200, {"Content-Type": "text/html"}, "<html><body><main><p>" + "1" * 200000 + "</p></main></body></html>")
    site["/bomb"] = ("BOMB",)
    site["/drip"] = ("DRIP",)
    site["/to-ftp"] = (302, {"Location": "ftp://example.com/x"}, "")
    return site


def wordpress_site(php=None, elementor_pro=None, upload=False, extra_head=""):
    """A WordPress site with an Elementor Pro asset, optionally announcing its PHP version."""
    ver = ("?ver=%s" % elementor_pro) if elementor_pro else ""
    head = ('<link rel="stylesheet" href="/wp-content/plugins/elementor-pro/assets/css/frontend.min.css%s">'
            '<meta name="generator" content="WordPress 6.8.3">' % ver) + extra_head
    form = '<form class="elementor-form"><input type="file" name="form_fields[resume]"></form>' if upload else ""
    site = clean_site()
    hdr = {"Content-Type": "text/html; charset=utf-8"}
    if php:
        hdr["X-Powered-By"] = "PHP/%s" % php
    for path, (st, h, body) in list(site.items()):
        if body.startswith("<!doctype"):
            site[path] = (st, hdr, body.replace("</head>", head + "</head>").replace("</main>", form + "</main>"))
    return site


def hosted_site():
    site = clean_site()
    site["/"] = (200, site["/"][1], site["/"][2].replace("</head>", '<link rel="stylesheet" href="https://static1.squarespace.com/static/x.css"></head>'))
    return site


SITES = {"wp-exposed": lambda: wordpress_site(php="8.1.27", elementor_pro="4.2.1", upload=True),
         "wp-old83": lambda: wordpress_site(php="8.3.30", elementor_pro="4.2.1"),
         "wp-patched": lambda: wordpress_site(php="8.3.36", elementor_pro="4.2.2", upload=True),
         "wp-hidden": lambda: wordpress_site(), "hosted": hosted_site,
         # Elementor Pro's folder also loads a bundled library at ?ver=1.2.1 (nashvilleroofingco.com, 2026-10-23).
         "wp-bundled": lambda: wordpress_site(php="8.2.35", elementor_pro="4.3.2", upload=True, extra_head=(
             '<script src="/wp-content/plugins/elementor-pro/assets/lib/smartmenus/jquery.smartmenus.min.js?ver=1.2.1"></script>')),
         "nasty": nasty_site, "empty": lambda: {"/": (200, {"Content-Type": "text/html"}, "")}, "thin": thin_sitemap_site, "clean": clean_site, "messy": messy_site, "realtor": realtor_site, "lender": lender_site, "dentist": dentist_site,
         "contractor": contractor_site, "spa": spa_site, "botwall": botwall_site, "sg-shield": sg_shield_site,
         "shield-title": shield_title_shield_less_site, "shield-words": real_page_with_shield_words_site, "encoding": encoding_site,
         "hostile": hostile_site, "big": big_sitemap_site,
         "error500": lambda: {"/": (500, {"Content-Type": "text/html"}, "<h1>Server error</h1>")},
         "pdf": lambda: {"/": (200, {"Content-Type": "application/pdf"}, "%PDF-1.4 fake")},
         "redirect": lambda: dict(clean_site(), **{"/": (301, {"Location": "/home"}, ""), "/home": clean_site()["/"]})}


def serve(site):
    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def _send(self, head):
            origin = "http://127.0.0.1:%d" % self.server.server_address[1]
            path = self.path.split("?")[0]
            entry = site.get(path, (404, {"Content-Type": "text/html"}, "<h1>Not found</h1>"))
            if entry == ("BOMB",):  # 1 GB of zeros, gzipped to about 1 MB
                data = BOMB
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.send_header("Content-Encoding", "gzip")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                if not head:
                    self.wfile.write(data)
                return
            if entry == ("DRIP",):  # a byte every half second, forever
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.end_headers()
                try:
                    for _ in range(200):
                        self.wfile.write(b"x")
                        self.wfile.flush()
                        time.sleep(0.5)
                except Exception:
                    pass
                return
            st, hdr, body = entry
            if isinstance(body, tuple):  # ("GZ", raw bytes): always compressed, asked or not
                data = gzip.compress(body[1])
            else:
                data = body.replace("{origin}", origin).encode("utf-8")
            self.send_response(st)
            for k, v in hdr.items():
                self.send_header(k, v)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            if not head:
                self.wfile.write(data)

        def do_GET(self):
            self._send(False)

        def do_HEAD(self):
            self._send(True)

    srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, "http://127.0.0.1:%d/" % srv.server_address[1]


def run(name, industry="auto", state="", lighthouse=False):
    srv, url = serve(SITES[name]())
    try:
        return grader.audit(url, name, industry, state, lighthouse=lighthouse, log=lambda m: None)
    finally:
        srv.shutdown()


# ---- Google's test with no scores: fixtures, no network, no Chrome
def lhr(scores=None, code=None, message=None):
    """A Lighthouse result as Lighthouse 12 writes it: four categories, maybe a runtimeError."""
    cats = {k: {"score": (scores or {}).get(k), "auditRefs": []} for k in ("performance", "accessibility", "best-practices", "seo")}
    out = {"categories": cats, "audits": {}}
    if code:
        out["runtimeError"] = {"code": code, "message": message or code}
    return out


LH_403 = lhr(code="ERRORED_DOCUMENT_REQUEST", message="Lighthouse was unable to reliably load the page you requested. Make sure you "
             "are testing the correct URL and that the server is properly responding to all requests. (Status code: 403)")
LH_500 = lhr(code="ERRORED_DOCUMENT_REQUEST", message="Lighthouse was unable to reliably load the page you requested. (Status code: 500)")
LH_NO_FCP = lhr(code="NO_FCP", message="The page did not paint any content. Please ensure you keep the browser window in the "
                "foreground during the load and try again. (NO_FCP)")
LH_HUNG = lhr(code="PAGE_HUNG", message="Lighthouse was unable to reliably load the URL you requested because the page stopped "
              "responding. (PAGE_HUNG)")
LH_OK = lhr({"performance": 0.9, "accessibility": 1.0, "best-practices": 1.0, "seo": 1.0})

# Real Lighthouse 12.8.2 results, trimmed to what the challenge check reads (2026-10-19).
# LH_CF_CHALLENGE: Cloudflare's "Performing security verification" page exactly as it answered our
# server for themashoregroup.com (captured from the checker's own browser), scored by Lighthouse:
# 100 / 93 / 93 / 50. The owner saw 83 / 93 / 71 / 45 for that site: the same page, not the site.
# LH_REAL_SITE: the same site's real home page from a home computer, SEO 100.
LH_CF_CHALLENGE = {
    "requestedUrl": "https://themashoregroup.com/", "mainDocumentUrl": "https://themashoregroup.com/",
    "finalDisplayedUrl": "https://themashoregroup.com/",
    "categories": {"performance": {"score": 1, "auditRefs": []}, "accessibility": {"score": 0.93, "auditRefs": []},
                   "best-practices": {"score": 0.93, "auditRefs": []}, "seo": {"score": 0.5, "auditRefs": []}},
    "audits": {
        "network-requests": {"details": {"type": "table", "items": [
            {"url": "https://themashoregroup.com/", "statusCode": 200, "resourceType": "Document"},
            {"url": "https://themashoregroup.com/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1?ray=a4d17fe45c21209a",
             "statusCode": 200, "resourceType": "Script"},
            {"url": "https://challenges.cloudflare.com/turnstile/v0/b/d2d3316b729e/api.js?onload=DraY9&render=explicit",
             "statusCode": 200, "resourceType": "Script"},
            {"url": "https://themashoregroup.com/favicon.ico", "statusCode": 200, "resourceType": "Image"}]}},
        "largest-contentful-paint-element": {"details": {"type": "list", "items": [{"type": "table", "items": [{"node": {
            "type": "node", "snippet": "<h1>", "nodeLabel": "themashoregroup.com"}}]}]}},
        "dom-size": {"details": {"type": "table", "items": [
            {"statistic": "Maximum DOM Depth", "node": {"type": "node", "snippet": "<div>", "nodeLabel": "div#XWAst9 > div > div > div"}},
            {"statistic": "Maximum Child Elements", "node": {"type": "node", "snippet": "<div class=\"main-content\">",
             "nodeLabel": "themashoregroup.com\nPerforming security verification\n\nThis website uses a secur\u2026"}}]}},
        "final-screenshot": {"details": {"type": "screenshot", "data": "data:image/jpeg;base64,/9j/challenge"}},
        "is-crawlable": {"score": 0}}}
LH_REAL_SITE = {
    "requestedUrl": "https://themashoregroup.com/", "mainDocumentUrl": "https://themashoregroup.com/",
    "finalDisplayedUrl": "https://themashoregroup.com/",
    "categories": {"performance": {"score": 0.56, "auditRefs": []}, "accessibility": {"score": 0.86, "auditRefs": []},
                   "best-practices": {"score": 0.79, "auditRefs": []}, "seo": {"score": 1, "auditRefs": []}},
    "audits": {
        "network-requests": {"details": {"type": "table", "items": [
            {"url": "https://themashoregroup.com/", "statusCode": 200, "resourceType": "Document"},
            {"url": "https://themashoregroup.com/wp-content/cache/wpfc-minified/kacsqfpu/43hds.js", "statusCode": 200, "resourceType": "Script"},
            {"url": "https://cdn-cookieyes.com/client_data/19aef4d5f276fa2c74434a99/script.js", "statusCode": 200, "resourceType": "Script"},
            {"url": "https://reputationhub.site/cdn-cgi/rum?", "statusCode": 204, "resourceType": "Fetch"}]}},
        "largest-contentful-paint-element": {"details": {"type": "list", "items": [{"type": "table", "items": [{"node": {
            "type": "node", "snippet": "<section class=\"elementor-section elementor-top-section\" data-id=\"684be72\">",
            "nodeLabel": "THE MASHORE GROUP\n\nYour Bay Area Real Estate Agents\n\nLUXURY HOME TEAM\n\nSEARCH P…"}}]}]}},
        "is-crawlable": {"score": 1}}}


def lh_with(base, urls=(), label=None, snippet=None, status=None, noindex=None):
    """A copy of a fixture with extra requests, a different largest element, main status or noindex."""
    out = json.loads(json.dumps(base))
    items = out["audits"]["network-requests"]["details"]["items"]
    items.extend({"url": u, "statusCode": 200, "resourceType": "Script"} for u in urls)
    if status is not None:
        items[0]["statusCode"] = status
    node = out["audits"]["largest-contentful-paint-element"]["details"]["items"][0]["items"][0]["node"]
    if label is not None:
        node["nodeLabel"] = label
    if snippet is not None:
        node["snippet"] = snippet
    if noindex is not None:
        out["audits"]["is-crawlable"]["score"] = 0 if noindex else 1
    return out


def fake_lighthouse(raw=None, **flags):
    """Stands in for grader.lighthouse_any: feeds a fixture through the engine's own read_lighthouse."""
    def fake(url, result, local_site):
        if raw is not None:
            grader.read_lighthouse(raw, result)
            result["_source"] = "fixture"
        result.update(flags)
    return fake


def run_lh(name, fake, public=True, local=False):
    """One audit with Lighthouse replaced by a fixture. public=True makes this computer's test
    server look like a site on the internet (so it is not 'not launched')."""
    real_lh, real_private, real_local = grader.lighthouse_any, grader.is_private_host, grader._local_by_name
    grader.lighthouse_any = fake
    if public:
        grader.is_private_host = lambda url: False
        grader._local_by_name = lambda url: False
    srv, url = serve(SITES[name]())
    try:
        return grader.audit(url, name, "auto", "", local, lighthouse=True, log=lambda m: None)
    finally:
        srv.shutdown()
        grader.lighthouse_any, grader.is_private_host, grader._local_by_name = real_lh, real_private, real_local


def lh_group(rep):
    return next((c for c in rep.get("categories", []) if c["name"].startswith("Google's own test")), None)


def expected_grade(rep):
    """The grade worked out by hand from the report: the category average, minus a quarter point
    per point a Google score is under its launch target (owner decision 2026-10-26)."""
    # The trust areas (security score, ownership, email, AI readiness, looked after) count as one area.
    trust = getattr(security, "TRUST_GROUPS", ())
    cats = [c["score"] for c in rep["categories"] if c["score"] is not None and c["name"] not in trust]
    tr = [c["score"] for c in rep["categories"] if c["score"] is not None and c["name"] in trust]
    if tr:
        cats.append(round(sum(tr) / len(tr)))
    lh = rep.get("lighthouse") or {}
    gap = sum(grader.BAR[k] - lh[k] for k in rep.get("belowBar") or [] if isinstance(lh.get(k), (int, float)))
    return max(0, round(round(sum(cats) / len(cats)) - gap / 4))


def coming_soon_site():
    return {"/": (200, {"Content-Type": "text/html"}, page("Coming soon: Cedar Lane Bakery in Portland",
            "<p>Our new website is on its way. Call the shop in the meantime.</p>"))}


SITES["coming-soon"] = coming_soon_site

ALLOW_NAME, ALLOW_VALUE = "X-KMC-Checker", "test-allowlist-value-7f3a9c"


def serve_recording(routes, tls=None):
    """A site that writes down, per request, which path was asked for and the allowlist header
    it carried (None when absent). routes: path -> (status, headers, body); {origin} and {other}
    in a header or body become this server's and the other server's addresses. tls: an
    ssl.SSLContext to serve https instead of http."""
    seen, other = [], {"url": ""}
    scheme = "https" if tls else "http"

    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def _send(self, head):
            seen.append((self.path.split("?")[0], self.headers.get(ALLOW_NAME)))
            origin = "%s://127.0.0.1:%d" % (scheme, self.server.server_address[1])
            st, hdr, body = routes.get(self.path.split("?")[0], (404, {"Content-Type": "text/html"}, "<h1>Not found</h1>"))
            fill = lambda s: s.replace("{origin}", origin).replace("{other}", other["url"]).replace("{plain}", other.get("plain", ""))  # noqa: E731
            data = fill(body).encode("utf-8")
            self.send_response(st)
            for k, v in hdr.items():
                self.send_header(k, fill(v))
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            if not head:
                self.wfile.write(data)

        def do_GET(self):
            self._send(False)

        def do_HEAD(self):
            self._send(True)

    srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
    if tls:
        srv.socket = tls.wrap_socket(srv.socket, server_side=True)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, seen, other


def local_tls():
    """A throwaway certificate for 127.0.0.1, made with openssl, and a client context that
    trusts only it. (server_ctx, client_ctx), or None when openssl is not on this computer."""
    if not shutil.which("openssl"):
        return None
    d = Path(tempfile.mkdtemp(prefix="wh-tls-"))
    crt, key = d / "c.pem", d / "k.pem"
    p = subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "2", "-subj", "/CN=127.0.0.1",
                        "-addext", "subjectAltName=IP:127.0.0.1", "-keyout", str(key), "-out", str(crt)],
                       capture_output=True, timeout=60)
    if p.returncode != 0 or not crt.exists():
        return None
    server = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    server.load_cert_chain(str(crt), str(key))
    client = ssl.create_default_context(cafile=str(crt))
    return server, client


def guard_cases():
    """The fetch guards that matter most on a public server, broken on purpose:
    - private_ok is decided by the address the person typed, never by a resolver, and a front
      door that turns local targets off keeps it off whatever any check says;
    - curl (the certificate fallback) never follows a redirect the urllib path would refuse,
      and when a front door pins addresses, curl connects only to the pinned one;
    - a page cannot pick a codec that decodes in quadratic time;
    - JSON-LD walking is iterative and keeps document order."""
    real_private, real_flag, real_pin = grader.is_private_host, grader.LOCAL_TARGETS_OK, grader.pin_address
    try:
        # A resolving check that says "private" (a rebinding answer, or a failed lookup) for a
        # public-looking name must never make the audit trust the local network.
        grader.is_private_host = lambda url: True
        grader.audit("https://rebinding.invalid/", "x", lighthouse=False, log=lambda m: None)
        step("guard: a resolver saying 'private' never turns on private_ok for a public name", grader.STATE["private_ok"] is False)
        grader.is_private_host = real_private
        grader.LOCAL_TARGETS_OK = False
        grader.audit("http://127.0.0.1:1/", "x", lighthouse=False, log=lambda m: None)
        step("guard: with local targets off, not even a local address turns on private_ok", grader.STATE["private_ok"] is False)
    finally:
        grader.is_private_host, grader.LOCAL_TARGETS_OK = real_private, real_flag
        grader.STATE["private_ok"] = False

    html = {"Content-Type": "text/html"}
    inner, inner_seen, _ = serve_recording({"/secret": (200, html, "<p>inside</p>")})
    outer, outer_seen, outer_other = serve_recording({
        "/r": (302, {"Location": "{other}/secret"}, ""),
        "/ok": (200, html, "<p>public page</p>"),
    })
    a, b = outer.server_address[1], inner.server_address[1]
    outer_other["url"] = "http://localhost:%d" % b  # "localhost" stands for the forbidden network here
    try:
        if not shutil.which("curl"):
            print("SKIP  guard: curl redirect cases (no curl on this computer; the fallback cannot run here either)", flush=True)
        else:
            grader.is_private_host = lambda url: (grader.urlparse(url).hostname or "") == "localhost"
            grader.STATE["private_ok"] = False
            st, final, _, code = grader._curl("http://127.0.0.1:%d/r" % a, "GET")
            step("guard: curl never follows a redirect into the refused network", not inner_seen and st == 302,
                 (inner_seen, st, final, code))
            grader.pin_address = lambda url: "127.0.0.1"
            st, _, text, _ = grader._curl("http://pinned.invalid:%d/ok" % a, "GET")
            step("guard: a pinned curl connects only to the vetted address", st == 200 and "public page" in text, (st, text[:80]))
            del outer_seen[:]
            grader.pin_address = lambda url: None
            st, _, _, _ = grader._curl("http://127.0.0.1:%d/ok" % a, "GET")
            step("guard: an address the front door will not vet is never fetched by curl", st == 0 and not outer_seen, (st, outer_seen))
    finally:
        grader.is_private_host, grader.pin_address = real_private, real_pin
        inner.shutdown()
        outer.shutdown()

    step("guard: a page cannot choose the punycode or idna codec",
         grader._charset({"content-type": "text/html; charset=punycode"}, b"") == "utf-8"
         and grader._charset({}, b'<meta charset="idna">') == "utf-8"
         and grader._charset({"content-type": "text/html; charset=latin-1"}, b"") == "latin-1")
    t0 = time.time()
    grader._body(b"a" * 200000 + b"-" + b"b" * 200000, {"content-type": "text/html; charset=punycode"})
    step("guard: a punycode-declared body decodes in linear time", time.time() - t0 < 2, time.time() - t0)

    def rec(o):
        if isinstance(o, dict):
            yield o
            for v in o.values():
                yield from rec(v)
        elif isinstance(o, list):
            for v in o:
                yield from rec(v)
    sample = {"@graph": [{"@type": "A", "x": [{"@type": "B"}, {"y": {"@type": "C"}}]}, {"@type": "D"}], "z": {"@type": "E"}}
    deep = leaf = {}
    for _ in range(5000):
        leaf["n"] = {}
        leaf = leaf["n"]
    try:
        n_deep = sum(1 for _ in grader.walk(deep))
    except RecursionError:
        n_deep = -1
    step("guard: JSON-LD walk keeps document order and survives deep nesting",
         [id(d) for d in grader.walk(sample)] == [id(d) for d in rec(sample)] and n_deep == 5001, n_deep)


def allowlist_cases():
    """The owner's allowlist header: sent only to the owner's hosts, on every kind of request the
    engine makes there; never to another site, a link elsewhere or a redirect target elsewhere;
    never in a report; and with the variables unset, never at all."""
    html = {"Content-Type": "text/html"}
    hv = grader.allowlist_header
    saved_env = {k: os.environ.get(k) for k in ("WH_ALLOWLIST_HEADER", "WH_ALLOWLIST_HOSTS")}
    os.environ.update({"WH_ALLOWLIST_HEADER": "%s: %s" % (ALLOW_NAME, ALLOW_VALUE), "WH_ALLOWLIST_HOSTS": "themashoregroup.com"})
    step("allowlist: never on plain http, even to the owner's own host",
         hv("http://themashoregroup.com/") is None and hv("https://themashoregroup.com/") == (ALLOW_NAME, ALLOW_VALUE))
    req = grader._with_allowlist(grader.Request("https://themashoregroup.com/"), True)
    step("allowlist: never on a request whose certificate is not checked", not req.has_header(ALLOW_NAME.capitalize())
         and ALLOW_NAME not in dict(req.unredirected_hdrs) and ALLOW_NAME.capitalize() not in dict(req.unredirected_hdrs))
    for k, v in saved_env.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v
    tls = local_tls()
    if tls is None:
        print("SKIP  allowlist over a live https server: openssl is not on this computer (the rules above still ran)", flush=True)
        return
    real_ctx = grader._ctx
    grader._ctx = tls[1]
    grader._openers.clear()
    try:
        _allowlist_live(html, tls[0])
    finally:
        grader._ctx = real_ctx
        grader._openers.clear()


def _allowlist_live(html, server_ctx):
    owner_srv, owner_seen, owner_other = serve_recording({
        "/": (200, html, page("Cedar Lane Bakery in Portland", "<p>%s</p><p><a href=\"/about\">About</a></p>" % PROSE)),
        "/about": (200, html, page("About Cedar Lane Bakery", "<p>%s</p>" % PROSE, path="/about")),
        "/robots.txt": (200, {"Content-Type": "text/plain"}, "User-agent: *\nAllow: /\nSitemap: {origin}/sitemap.xml\n"),
        "/sitemap.xml": (200, {"Content-Type": "application/xml"},
                         '<?xml version="1.0"?><urlset><url><loc>{origin}/</loc></url><url><loc>{origin}/about</loc></url></urlset>'),
        "/hop": (302, {"Location": "{origin}/about"}, ""),
        "/away": (302, {"Location": "{other}/landing"}, ""),
        "/downgrade": (302, {"Location": "{plain}/landing"}, ""),
    }, tls=server_ctx)
    other_srv, other_seen, _ = serve_recording({
        "/elsewhere": (200, html, page("Elsewhere", "<p>Another site.</p>")),
        "/landing": (200, html, page("Landing", "<p>Another site.</p>")),
    })
    owner = "https://127.0.0.1:%d" % owner_srv.server_address[1]
    other = "http://localhost:%d" % other_srv.server_address[1]  # same machine, a different host name
    owner_other["url"] = other
    saved = {k: os.environ.get(k) for k in ("WH_ALLOWLIST_HEADER", "WH_ALLOWLIST_HOSTS")}

    def setenv(header=None, hosts=None):
        for k, v in (("WH_ALLOWLIST_HEADER", header), ("WH_ALLOWLIST_HOSTS", hosts)):
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v

    try:
        # Unset: the default everywhere the skill runs. Nothing is sent.
        setenv()
        grader.audit(owner + "/", "Owner", lighthouse=False, log=lambda m: None)
        step("allowlist: unset, no request carries the header", owner_seen and all(v is None for _, v in owner_seen + other_seen),
             owner_seen + other_seen)

        # Set: every engine request to the owner's host carries it; the other host never sees it.
        del owner_seen[:], other_seen[:]
        setenv("%s: %s" % (ALLOW_NAME, ALLOW_VALUE), "127.0.0.1")
        rep = grader.audit(owner + "/", "Owner", lighthouse=False, log=lambda m: None)
        paths = {p for p, _ in owner_seen}
        step("allowlist: page reads, link checks, robots.txt and sitemap on the owner's host all carry it",
             {"/", "/about", "/robots.txt", "/sitemap.xml"} <= paths and all(v == ALLOW_VALUE for _, v in owner_seen), owner_seen)
        del owner_seen[:], other_seen[:]
        grader.STATE["private_ok"] = True
        grader.check_status(owner + "/about")
        grader.fetch(other + "/elsewhere")
        step("allowlist: a link check on the owner's host carries it; a request to another host does not",
             owner_seen == [("/about", ALLOW_VALUE)] and other_seen == [("/elsewhere", None)], (owner_seen, other_seen))
        rendered = json.dumps(rep) + report_html.render([rep])
        step("allowlist: the value never appears in the report or its JSON", ALLOW_VALUE not in rendered)

        # Redirects: kept on a hop that stays on the owner's host, dropped on a hop that leaves it.
        del owner_seen[:], other_seen[:]
        grader.fetch(owner + "/hop")
        step("allowlist: a redirect within the owner's host keeps it",
             owner_seen == [("/hop", ALLOW_VALUE), ("/about", ALLOW_VALUE)], owner_seen)
        del owner_seen[:], other_seen[:]
        st, final, _ = grader.fetch(owner + "/away")
        step("allowlist: a redirect to another host drops it",
             owner_seen == [("/away", ALLOW_VALUE)] and other_seen == [("/landing", None)] and st == 200, (owner_seen, other_seen, st))
        # https on the owner's host, then a redirect to the SAME host over plain http: never sent in clear.
        owner_other["plain"] = "http://127.0.0.1:%d" % other_srv.server_address[1]
        del owner_seen[:], other_seen[:]
        st, final, _ = grader.fetch(owner + "/downgrade")
        step("allowlist: a redirect from https to plain http on the owner's own host drops it",
             owner_seen == [("/downgrade", ALLOW_VALUE)] and other_seen == [("/landing", None)] and st == 200, (owner_seen, other_seen, st))

        # Only the listed hosts, and their subdomains: never a look-alike name.
        setenv("%s: %s" % (ALLOW_NAME, ALLOW_VALUE), "themashoregroup.com")
        hv = grader.allowlist_header
        step("allowlist: the domain and its subdomains match, look-alikes do not",
             hv("https://themashoregroup.com/") == (ALLOW_NAME, ALLOW_VALUE) and hv("https://www.themashoregroup.com/x") is not None
             and hv("https://evilthemashoregroup.com/") is None and hv("https://themashoregroup.com.evil.example/") is None
             and hv("https://example.com/") is None)
        setenv("%s: %s" % (ALLOW_NAME, ALLOW_VALUE))
        step("allowlist: a header with no hosts listed goes nowhere", hv("https://themashoregroup.com/") is None)

        # Malformed: never sent, never a crash.
        bad = ["no-colon-at-all", ": value-without-name", "X-KMC-Checker:", "X KMC: v", "X-KMC-Checker: v\r\nX-Evil: 1"]
        ok = True
        for b in bad:
            setenv(b, "127.0.0.1")
            del owner_seen[:]
            st, _, _ = grader.fetch(owner + "/about")
            ok = ok and st == 200 and all(v is None for _, v in owner_seen) and hv(owner + "/") is None
        step("allowlist: a malformed setting sends nothing and the check still runs", ok)
    finally:
        grader.STATE["private_ok"] = False
        for k, v in saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        owner_srv.shutdown()
        other_srv.shutdown()


def check(rep, name):
    return next((c for c in rep.get("checks", []) if c["name"] == name), None)


def status(rep, name):
    c = check(rep, name)
    return c["status"] if c else None


# ------------------------------------------------------------------- the cases
# ---- What the site is built on (platform and PHP). Read-only: it reads the page and headers already fetched.
WP_HEAD = ('<meta name="generator" content="WordPress 6.4.2"><link rel="https://api.w.org/" href="{origin}/wp-json/">'
           '<link rel="stylesheet" href="{origin}/wp-content/themes/x/style.css">')


def with_head(extra, headers=None, base=None):
    site = dict((base or clean_site)())
    st, hdr, body = site["/"]
    site["/"] = (st, dict(hdr, **(headers or {})), body.replace("</head>", extra + "</head>", 1))
    return site


def platform_site(kind):
    if kind == "wordpress":
        return with_head(WP_HEAD)
    if kind == "wordpress-header":
        return with_head(WP_HEAD, {"X-Powered-By": "PHP/8.2.20"})
    if kind == "php-patched":
        return with_head("", {"X-Powered-By": "PHP/8.4.27"})
    if kind == "php-old-branch":
        return with_head("", {"X-Powered-By": "PHP/7.4.33"})
    if kind == "nextjs":
        return with_head('<script src="{origin}/_next/static/chunks/main.js"></script>', {"X-Powered-By": "Next.js"})
    if kind == "drupal":
        return with_head('<meta name="Generator" content="Drupal 10 (https://www.drupal.org)">', {"X-Generator": "Drupal 10 (https://www.drupal.org)"})
    if kind == "joomla":
        return with_head('<meta name="generator" content="Joomla! - Open Source Content Management">')
    if kind == "hostile-generator":
        return with_head('<meta name="generator" content="WordPress 6.4.2&lt;script&gt;alert(1)&lt;/script&gt;"><link href="{origin}/wp-content/a.css">')
    if kind == "mention":
        return with_head('<p>Why we left WordPress: our old /wp-content/ folder and wp-json API were slow. We compared drupal-settings-json, joomla /media/jui/ and /components/com_ paths.</p><a href="https://other.example/wp-content/uploads/a.jpg">their post</a>')
    raise KeyError(kind)


for _k in ("mention", "wordpress", "wordpress-header", "php-patched", "php-old-branch", "nextjs", "drupal", "joomla", "hostile-generator"):
    SITES["pf-" + _k] = (lambda k=_k: platform_site(k))


def platform_cases():
    base = run("clean")
    wp = run("pf-wordpress")
    p = wp.get("platform") or {}
    step("platform: WordPress page reads as WordPress on PHP, one plain line", p.get("line") == "Built on WordPress, which runs on PHP.", p)
    note = p.get("phpNote") or {}
    blob = json.dumps(note)
    step("platform: PHP site gets the red flag, naming the 21 Oct 2026 update and BOSS-built sites",
         note.get("title") == "Your site runs on PHP" and "21 Oct 2026" in blob and "BOSS-built" in blob, note)
    step("platform: the red flag gives no versions, host questions or fixes (owner decision 2026-10-23)",
         not re.search(r"8\.\d+\.\d+|whoever hosts|ask (the|your) host|questions", blob, re.I) and set(note) == {"title", "detail"}, note)
    step("platform: never says a site is safe, secure or patched on its own word",
         not re.search(r"\b(is safe|are safe|is secure|unhackable|is patched|is protected)\b", blob + json.dumps(p), re.I), blob)
    # Merged design: hidden versions add honest "not measured" lines, never a pass, fail or warning.
    # Detecting the platform grades nothing. (Its own Security score rows, added 2026-10-24, are excluded.)
    score = lambda r: [(c["name"], c["score"]) for c in r["categories"] if c["name"] != "Security score"]
    step("platform: grade untouched by the platform section", score(wp) == score(base), (score(wp), score(base)))
    page = report_html.render([wp])
    step("platform: the visual report shows a Red Flags section, above Fix these first, with the line and the flag",
         "Red Flags" in page and "Built on WordPress, which runs on PHP." in page and "BOSS-built" in page
         and 0 < page.find("Red Flags") < page.find('class="check ') and "What your site is built on" not in page)
    step("platform: the visual report no longer carries the host questions", "Ask whoever hosts" not in page and "8.5.12" not in page)
    page_hosted = report_html.render([run("hosted")])
    step("platform: a site not on PHP gets no PHP red flag, and still says what it is built on",
         "Your site runs on PHP" not in page_hosted and "What your site is built on" in page_hosted)
    h = (run("pf-wordpress-header").get("platform") or {})
    step("platform: PHP header version is read", h.get("phpVersion") == "8.2.20" and h.get("phpNote"), h)
    step("platform: an old stated PHP version gets the same red flag, no version talk", (h.get("phpNote") or {}) == (p.get("phpNote") or {}), h.get("phpNote"))

    o = (run("pf-php-patched").get("platform") or {})
    step("platform: PHP from a header alone, no CMS, still flagged", o.get("php") is True and o.get("platform") is None and "PHP" in o.get("line", ""), o)
    step("platform: a fixed stated version is not called safe: still flagged", bool(o.get("phpNote")), o)
    old = (run("pf-php-old-branch").get("platform") or {})
    step("platform: a PHP branch not in the fixed list is read and flagged", old.get("phpVersion") == "7.4.33" and old.get("phpNote") and old.get("php") is True, old)

    n = (run("pf-nextjs").get("platform") or {})
    step("platform: static Next.js page: Next.js line, no PHP item", n.get("platform") == "Next.js" and not n.get("php") and not n.get("phpNote") and "PHP" not in n.get("line", "").replace("not PHP", ""), n)
    step("platform: Next.js line does not claim the site is safe", "safe" not in json.dumps(n).lower(), n)
    d = (run("pf-drupal").get("platform") or {})
    step("platform: Drupal detected, runs on PHP", d.get("platform") == "Drupal" and d.get("php") is True and d.get("line") == "Built on Drupal, which runs on PHP.", d)
    j = (run("pf-joomla").get("platform") or {})
    step("platform: Joomla detected, runs on PHP", j.get("platform") == "Joomla" and j.get("php") is True and j.get("line") == "Built on Joomla, which runs on PHP.", j)

    c = (base.get("platform") or {})
    step("platform: nothing recognised says so and does not guess", c.get("platform") is None and not c.get("php") and "not" in c.get("line", "").lower(), c)

    hs = run("pf-hostile-generator")
    step("platform: hostile generator text cannot inject into the report", "<script>alert(1)" not in report_html.render([hs]), (hs.get("platform") or {}).get("line"))

    b = run("botwall")
    step("platform: a blocked page says not measured, never a guess", (b.get("platform") or {}).get("measured") is False and "not measured" in (b.get("platform") or {}).get("line", "").lower(), b.get("platform"))
    e = run("error500")
    step("platform: an error page says not measured", (e.get("platform") or {}).get("measured") is False, e.get("platform"))

    import security as platform_detect
    mention = ('<p>Why we left WordPress: our old /wp-content/ folder and wp-json API were slow. We compared drupal-settings-json, '
               'joomla /media/jui/ and /components/com_ paths.</p><a href="https://other.example/wp-content/uploads/a.jpg">their post</a>')
    m = (run("pf-mention").get("platform") or {})
    step("platform: a page that only talks about WordPress, Drupal or Joomla is not called built on it", m.get("platform") is None and not m.get("php"), m)
    mini = platform_detect.detect('<html><head><link rel=stylesheet href=/wp-content/themes/a.css><script src=/wp-includes/js/jquery.min.js></script></head></html>', {})
    step("platform: minified WordPress with bare (unquoted) addresses is still read", mini.get("platform") == "WordPress" and mini.get("php") is True, mini)
    for hv in ("PHP", "PHP/8.3"):
        bare = platform_detect.detect("<html></html>", {"X-Powered-By": hv})
        step("platform: header %r names PHP, version not measured" % hv, bare.get("php") is True and bare.get("phpVersion") is None
             and bare.get("phpNote") and "PHP" in bare.get("line", ""), bare)
    bw = run("botwall")
    html = report_html.render([bw])
    step("platform: a blocked page's report says the platform is not measured", "not measured, because the page could not be read" in html, "")
    srv, url = serve(SITES["botwall"]())
    try:
        out = subprocess.run([sys.executable, str(HERE / "audit.py"), url, "--no-lighthouse", "--out-dir", tempfile.mkdtemp()], capture_output=True, text=True, timeout=120).stdout
    finally:
        srv.shutdown()
    step("platform: a blocked page's command line output says not measured", "Built on: not measured" in out, out[-400:])

    try:
        import security as platform_detect
        step("platform: detect() works on raw markup and headers with no network",
             platform_detect.detect("<html></html>", {}).get("platform") is None and platform_detect.detect(None, None).get("measured") is False)
    except Exception as ex:
        step("platform: detect() works on raw markup and headers with no network", False, ex)


# ------------------------------------------------------------------- the cases
def main():
    # Windows sends output through a pipe in the local code page (cp1252), which cannot
    # print the accented words and dashes real websites contain. Never crash on a character.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    lighthouse = "--lighthouse" in sys.argv
    print("python %s on %s" % (sys.version.split()[0], sys.platform), flush=True)

    r = run("clean", lighthouse=lighthouse)
    # Served over plain http from this computer, so https is the one thing it cannot pass.
    # Speed depends on the machine running the test (a slow CI Mac scores lower), so it
    # is measured here but not required to pass.
    fails = [c["name"] for c in r["checks"] if c["status"] in ("fail", "warn") and c["name"] not in ("Secure connection (https)", "Speed")]
    step("clean site: nothing to fix", r["reachable"] and not fails, fails)
    step("clean site: detected as general, state OR from markup", r["industry"] == "general" and r["state"] == "OR", (r["industry"], r["state"]))
    step("clean site: Lighthouse skipped is 'not measured', never passed", status(r, "Speed") == ("pass" if lighthouse else "notMeasured") or lighthouse, status(r, "Speed"))
    if lighthouse:
        lh = r["lighthouse"]
        step("clean site: Lighthouse produced four scores", all(lh.get(k) is not None for k in ("performance", "accessibility", "bestPractices", "seo")),
             "%s\n%s" % (r.get("lighthouseError"), (r.get("lighthouseLog") or "")[-1500:]))
        step("clean site: phone screenshot captured", (r.get("screenshot") or "").startswith("data:image/"))
        step("clean site: Lighthouse ran on this computer, not Google's servers", "this computer" in (r.get("lighthouseSource") or ""), r.get("lighthouseSource"))
    if lighthouse:
        # A slow CI machine can score Speed lower; the grade then loses the shortfall, no more.
        step("clean site: 85+ with Lighthouse, the average minus Google's shortfall",
             (r["overall"] or 0) >= 85 and r["overall"] == expected_grade(r), (r["overall"], r["letter"], r["lighthouse"]))
    else:
        step("clean site: graded A without Lighthouse", r["letter"] == "A", (r["overall"], r["letter"]))
    step("clean site: the letter follows the number, number alongside letter",
         r["letter"] == grader.letter(r["overall"]) and isinstance(r["overall"], int) and "caps" in r, (r["overall"], r["letter"]))

    r = run("messy")
    expect_fail = ["Page titles the right length", "Search descriptions", "Exactly one main heading", "Canonical address on every page",
                   "Sitemap", "Search engines allowed in", "Language declared", "llms.txt for AI assistants", "Every image described",
                   "Written correctly (valid JSON)", "Every cross-reference resolves (@id)", "FAQ markup matches what is on the page",
                   "Pages that load", "Every link opens a real page", "No leftover template text", "Nothing left to fill in",
                   "No near-duplicate pages", "Tracking tools disclosed"]
    wrong = [n for n in expect_fail if status(r, n) != "fail"]
    step("messy site: every planted problem is caught", not wrong, [(n, status(r, n)) for n in wrong])
    step("messy site (general business): claims to prove are a warning, as the service seeds rule", status(r, "No claims you would have to prove (FTC)") == "warn")
    step("messy site: robot phrasing is a warning, not a fail", status(r, "Sounds like a person, not a robot") == "warn")
    home = next(p for p in r["pages"] if p["path"] == "/")
    step("messy site: SVG icon titles do not leak into the page title", home["title"] == "Hi", home["title"])
    step("messy site: Meta pixel named as undisclosed", "Meta pixel" in (check(r, "Tracking tools disclosed") or {}).get("detail", ""))
    step("messy site: grade is F", r["letter"] == "F", (r["overall"], r["letter"]))
    step("messy site: the letter follows the number", r["letter"] == grader.letter(r["overall"]), (r["overall"], r["letter"]))
    step("messy site: no real-estate rules on a non-realtor", not any(c["group"].startswith("Real estate") for c in r["checks"]))

    r = run("realtor")
    step("realtor: detected from RealEstateAgent markup", r["industry"] == "real-estate", r["industry"])
    fh = check(r, "Fair Housing language") or {}
    step("realtor: Fair Housing phrases fail", fh.get("status") == "fail" and "family-friendly" in fh.get("detail", "").lower() and "safe area" in fh.get("detail", "").lower(), fh.get("detail"))
    step("realtor: claims to prove fail, as the realtor seed rules", status(run("realtor"), "No claims you would have to prove (FTC)") == "fail")
    step("realtor: school phrase warns", status(r, "Phrases that can read as steering") == "warn")
    warns = lambda t: any(re.search(p, t, re.I) for p, _ in grader.FH_WARN)
    step("Fair Housing risk phrases from the VIP portal are warned about here too (one rule list)",
         all(warns(t) for t in ("the house where they raised their kids", "a widow in Land Park", "room for a growing family", "a single mom"))
         and not any(warns(t) for t in ("a big family room", "family-owned since 1990", "single-story ranch")))
    step("realtor: commission wording warns", status(r, "Commission wording") == "warn")
    lic = check(r, "License number on every page") or {}
    step("realtor: license missing on exactly the one page without the footer", lic.get("status") == "fail" and lic.get("pages") == ["/contact"], lic)
    step("realtor: Equal Housing missing on some pages", status(r, "Equal Housing Opportunity on every page") == "fail")
    step("realtor: told to stay 'general' it skips Fair Housing", not any(c["group"].startswith("Real estate") for c in run("realtor", "general")["checks"]))

    # Saying "guarantee" is not promising one. A site answering its own FAQ
    # honestly kept failing this rule, and the only way to pass was to write
    # worse. These guard both directions: a denial or an answered question is
    # excused, an actual promise still fails. See NEGATABLE in grader.py.
    _g_pat = [p for p, w in grader.CLAIMS if w in grader.NEGATABLE][0]

    def _fires(s):
        return any(not grader.honest_mention(s, m.start(), m.end())
                   for m in re.finditer(_g_pat, s, re.I))

    for _s in [
        "Will upgrades guarantee a higher sale price? Nothing is guaranteed, but the right ones help.",
        "Will offering more money guarantee I win? No. Sellers look at the whole package.",
        "You are not asking for a guarantee. You are asking whether there is a defined process.",
        "There are no guarantees in this market.",
        "Information deemed reliable but not guaranteed.",
        "We cannot guarantee a sale by a certain date.",
    ]:
        step("guarantee rule excuses honest writing: %s" % _s[:46], not _fires(_s))

    for _s in [
        "We guarantee results for every seller.",
        "Your home sale is guaranteed.",
        "Our 100% satisfaction guarantee applies.",
        # A question nobody answers in the negative is still marketing.
        "Looking for a guarantee? We give you one.",
    ]:
        step("guarantee rule still catches a promise: %s" % _s[:46], _fires(_s))

    # "cheapest" alone is ordinary English. It needs something it is cheapest
    # AT before it is a price claim about what the business charges.
    _c_pat = [p for p, w in grader.CLAIMS if w == "price superlative"][0]
    for _s, _want in [
        ("The hour you spend gathering records is the cheapest hour of the whole sale.", False),
        ("Timing is a term, and often the cheapest one.", False),
        ("Most listings fail there because it is the cheapest to skip.", False),
        ("We are the cheapest agent in town.", True),
        ("Our cheapest commission in the county.", True),
        ("We have the lowest rates anywhere.", True),
    ]:
        step("price superlative %s: %s" % ("fires" if _want else "stays quiet", _s[:40]),
             bool(re.search(_c_pat, _s, re.I)) == _want)

    # Every town the business serves counts, not only the one it sits in.
    _pages = [{"nodes": [{"@type": "RealEstateAgent",
                          "address": {"addressLocality": "Brentwood, CA"},
                          "areaServed": [{"name": "Martinez, CA"}, "Antioch, CA"]}]}]
    _pl = grader._places(_pages)
    step("places: the business city comes first", _pl and _pl[0] == "Brentwood", _pl)
    step("places: served towns are included, state stripped",
         "Martinez" in _pl and "Antioch" in _pl, _pl)
    step("places: no duplicates", len(_pl) == len(set(x.lower() for x in _pl)), _pl)

    t = grader.detect_industry({"Organization", "WebSite", "Person"},
                               "The Mashore Group | Bay Area Real Estate Experts Work with The Mashore Group, trusted Bay Area real estate experts helping buyers and sellers",
                               "The Mashore Group | Bay Area Real Estate Experts Work with The Mashore Group, trusted Bay Area real estate experts helping buyers and sellers")
    step("'Real Estate Experts' in the title is detected as real estate (themashoregroup.com, 2026-10-14)", t[0] == "real-estate", t)

    r = run("lender")
    step("lender: detected from the words (NMLS, loan officer)", r["industry"] == "lender", (r["industry"], r["industryWhy"]))
    ln = check(r, "Lending claims") or {}
    step("lender: rate, payment and approval claims fail", ln.get("status") == "fail" and ln.get("count", 0) >= 3, ln)
    step("lender: NMLS present but company NMLS missing", status(r, "NMLS number on every page") == "pass" and status(r, "Company NMLS number on every page") == "fail")

    r = run("dentist")
    step("dentist: detected from Dentist markup, state CA from 'California'", r["industry"] == "dentist" and r["state"] == "CA", (r["industry"], r["state"]))
    cf = check(r, "Claims CA does not allow") or {}
    step("dentist CA: 'painless' fails under B&P 1680(l)", cf.get("status") == "fail" and "painless" in cf.get("detail", "").lower(), cf)
    tw = check(r, "Claims this trade must be careful with") or {}
    step("dentist CA: before-and-after and superiority warn", tw.get("status") == "warn" and "before and after" in tw.get("detail", "").lower())
    step("dentist CA: 'results may vary' flagged", status(r, "Offers and disclaimers") == "warn")
    r2 = run("dentist", "dentist", "OH")
    step("dentist OH: unverified state said out loud, not passed", status(r2, "State rules for this trade") == "notMeasured" and not check(r2, "Claims OH does not allow"))

    r = run("contractor")
    step("plumber CA: missing licence number fails (B&P 7030.5)", any(c["name"].startswith("On every page: a contractor licence") and c["status"] == "fail" for c in r["checks"]), [c["name"] for c in r["checks"] if c["group"].startswith("Advertising")])
    step("plumber CA: free estimate flagged", status(r, "Offers and disclaimers") == "warn")
    r2 = run("contractor", "plumber", "NV")
    step("plumber NV: 'licensed' with no number is a warning, not a fail", status(r2, "Licence number shown where the site says licensed") == "warn")

    r = run("spa")
    step("JavaScript-only site: flagged as unreadable without JavaScript", status(r, "Words readable without JavaScript") == "fail")

    r = run("botwall")
    step("bot wall: reported as blocked, not graded", r.get("blocked") and not r["reachable"] and "letter" not in r, r.get("message"))
    # 2026-10-26: SiteGround's "Bot Verification" page (status 200) was graded as nashvilleroofingco.com.
    for nm in ("sg-shield", "shield-title"):
        r = run(nm)
        step("%s: a shield page answering 200 is reported as blocked, never graded as the site" % nm,
             r.get("blocked") and not r["reachable"] and "letter" not in r, (r.get("message"), r.get("overall")))
    r = run("shield-words")
    step("a real page titled like a shield, with real words, is still read and graded", r.get("reachable") and r.get("overall") is not None, r.get("message"))

    r = run("encoding")
    home = r["pages"][0] if r.get("pages") else {}
    step("gzip + latin-1: decoded correctly", r["reachable"] and "Québec" in home.get("title", ""), home.get("title"))

    r = run("error500")
    step("home page 500: honest message, no grade", not r["reachable"] and "500" in r["message"])
    r = run("pdf")
    step("a PDF address: says it is a file", not r["reachable"] and "file" in r["message"])
    r = run("redirect")
    step("redirected home page: followed and graded", r["reachable"] and r["url"].endswith("/home") and r["letter"] == "A", (r.get("url"), r.get("letter")))

    t0 = time.time()
    try:
        r = run("nasty")
        crashed = None
    except Exception as e:
        r, crashed = {}, repr(e)
    took = time.time() - t0
    step("hostile site: no crash (bad sitemap lines, odd @id, broken links and markup)", crashed is None and r.get("reachable"), crashed or r.get("message"))
    step("hostile site: regex bombs, gzip bomb and slow drip finish quickly (%ds)" % took, took < 30, took)
    step("hostile site: blocking only GPTBot is not 'search engines blocked'", status(r, "Search engines allowed in") == "pass", status(r, "Search engines allowed in"))
    step("hostile site: relative 'Sitemap: sitemap.xml' is read", r.get("facts", {}).get("sitemapPages", 0) >= 6, r.get("facts"))
    r = grader.audit("http://127.0.0.1:%d/" % 1, "x", lighthouse=False, log=lambda m: None)
    rl = run("nasty", "lender")
    step("hostile site as a lender: a 200,000-digit number does not hang the rate check", rl.get("reachable"))
    r = run("empty")
    step("empty home page: 'nothing to check', never 'all passed'", not r["reachable"] and "empty" in r["message"], r.get("message"))
    step("never fetches ftp: or this computer from a public site", not grader.allowed("ftp://x/y") and grader.allowed("https://example.com"))
    grader.STATE["private_ok"] = False
    step("a public site cannot point the checker at this computer", not grader.allowed("http://127.0.0.1:8080/admin") and not grader.allowed("http://169.254.169.254/"))

    r = run("thin")
    step("sitemap naming only the home page: the home page's links are read too", r["facts"]["pagesChecked"] >= 6, r["facts"])

    # ---- the software behind the site (security.py, merged with Krista's platform_detect)
    sec = lambda r: {c["name"]: c for c in r["checks"] if c["group"].startswith("Security of the software")}
    nm = lambda r: {c["name"]: c for c in r["checks"] if c["group"] == "Not measured here"}
    EP = "No known attacked flaw in Elementor Pro"
    r = sec(run("wp-exposed"))
    php, bld = r.get("PHP is up to date (PHP2Shell)") or {}, r.get(EP) or {}
    step("PHP 8.1 shown in a header: fail, no fix will ever come", php.get("status") == "fail" and "8.1.27" in php.get("detail", "") and "no security fixes" in php.get("detail", ""), php)
    step("Elementor Pro 4.2.1 with an upload field: fail, names CVE-2026-32475", bld.get("status") == "fail" and "CVE-2026-32475" in bld.get("detail", ""), bld)
    r = sec(run("wp-old83"))
    php, bld = r.get("PHP is up to date (PHP2Shell)") or {}, r.get(EP) or {}
    step("PHP 8.3.30: fail, names the fix 8.3.36", php.get("status") == "fail" and "8.3.36" in php.get("detail", "") and "8.3.36" in php.get("fix", ""), php)
    step("Elementor Pro 4.2.1 with no upload field seen: a warning, not a fail", bld.get("status") == "warn", bld)
    full = run("wp-patched")
    r = sec(full)
    step("PHP 8.3.36 and Elementor Pro 4.2.2: both pass", all(c["status"] == "pass" for c in r.values()) and len(r) == 2, r)
    step("a patched PHP still asks the host to confirm (a header can be wrong)", "confirm" in (r.get("PHP is up to date (PHP2Shell)") or {}).get("detail", ""), r)
    hid = run("wp-hidden")
    step("WordPress with PHP and Elementor Pro versions hidden: nothing scored, never a pass",
         sec(hid) == {} and {"Your PHP version", "Elementor Pro's version"} <= set(nm(hid)), (sec(hid), list(nm(hid))))
    # The WordPress-announces-its-version row (Security score, 2026-10-24) is its own area; the software
    # section must still leave every other area's score where the clean site has it.
    areas = lambda r: [(c["name"], c["score"]) for c in r["categories"] if c["name"] != "Security score"]
    step("hidden versions leave every other area's score alone", areas(hid) == areas(run("clean")), (areas(hid), areas(run("clean"))))
    step("the box names the builder: WordPress with Elementor Pro", (hid.get("platform") or {}).get("line") == "Built on WordPress with Elementor Pro, which runs on PHP.", hid.get("platform"))
    r = sec(run("wp-bundled"))
    step("a bundled library's ?ver=1.2.1 is not read as the plugin's version", (r.get(EP) or {}).get("status") == "pass" and "4.3.2" in r[EP]["detail"], r)
    hs = run("hosted")
    step("Squarespace site: the box says PHP flaws do not reach it, nothing scored",
         "Squarespace" in (hs.get("platform") or {}).get("line", "") and not (hs.get("platform") or {}).get("php") and sec(hs) == {}, hs.get("platform"))
    step("the advisory list's date is said out loud", "updated 2026-10-23" in (nm(hid).get("Every WordPress plugin's own updates") or {}).get("detail", ""))
    # Red flags (owner decision 2026-10-23): a flag says what was found, it is not a to-do list.
    ex = run("wp-exposed")
    titles = [f["title"] for f in ex["redFlags"]]
    step("attacked flaws are red flags: PHP first, then the outdated PHP and Elementor Pro",
         titles[0] == "Your site runs on PHP" and {"Out-of-date PHP", "Elementor Pro has a known security flaw"} <= set(titles), titles)
    flagged = {f["check"] for f in ex["redFlags"]}
    step("a red flag is not repeated under Fix these first", not flagged & {c["name"] for c in report_html.top_fixes(ex, 50)}, flagged)
    page = report_html.render([ex])
    step("every red flag carries the red flag emoji in the report", page.count("&#x1F6A9;") == len(ex["redFlags"]), page.count("&#x1F6A9;"))
    step("the Red Flags section sits above the check-by-check detail", 0 < page.find("Red Flags") < page.find('class="check '), "")
    for site, want in (("realtor", {"Possible Fair Housing problem", "License number missing", "No privacy policy"}),
                       ("lender", {"Company NMLS number missing", "Equal Housing Lender missing"}),
                       ("messy", {"Hidden from Google"})):
        got = {f["title"] for f in run(site)["redFlags"]}
        step("%s site: the legal and visibility red flags are raised" % site, want <= got, got)
    every = [f for site in ("wp-exposed", "realtor", "lender", "messy", "clean", "dentist") for f in run(site)["redFlags"]]
    step("no red flag gives steps, versions or a host to ask: one or two short sentences",
         all(len(f["detail"]) <= 330 and f["detail"].count(".") <= 4 and not re.search(r"Fix:|whoever|ask (the|your) host|\d+\.\d+\.\d+|WordPress, then Plugins", f["detail"]) for f in every),
         [f["detail"] for f in every if len(f["detail"]) > 330])
    step("a license number left blank to fill in is not a red flag",
         security.red_flags([{"group": "Real estate rules", "name": "License number on every page", "status": "todo"}], {}) == [])
    guessed = [{"group": "Real estate rules", "name": "License number on every page", "status": "fail"},
               {"group": "Real estate rules", "name": "Fair Housing language", "status": "fail"},
               {"group": "Advertising rules", "name": "Claims CA does not allow", "status": "fail"},
               {"group": "Privacy", "name": "Privacy policy page", "status": "fail"}]
    step("a trade only guessed from word counts raises no trade-rule flags (wix.com shape), other flags stay",
         [f["title"] for f in security.red_flags(guessed, {}, trade_sure=False)] == ["No privacy policy"]
         and len(security.red_flags(guessed, {})) == 4, security.red_flags(guessed, {}, trade_sure=False))
    step("the grader's guessed-trade wording is the one red flags look for",
         grader.detect_industry(set(), "", "real estate " * 20)[1].startswith(grader.INDUSTRY_GUESSED), grader.detect_industry(set(), "", "real estate " * 20))
    step("a passing or warning check outside security is never a red flag",
         security.red_flags([{"group": "Privacy", "name": "Privacy policy page", "status": "pass"},
                             {"group": "Can Google and AI assistants find it", "name": "Search engines allowed in", "status": "warn"}], {}) == [])
    # Break-it run, 2026-10-23: real header shapes, and page bombs that froze the first merge.
    status_of = lambda xpb: [c[1] for c in security.assess({"X-Powered-By": xpb}, [{"raw": "<html></html>"}])[0]]
    step("'PHP/8.3.36-1ubuntu1' (a distro build) reads as patched", status_of("PHP/8.3.36-1ubuntu1") == ["pass"], status_of("PHP/8.3.36-1ubuntu1"))
    step("'PHP/7.4.33, PleskLin' reads as out of support", status_of("PHP/7.4.33, PleskLin") == ["fail"], status_of("PHP/7.4.33, PleskLin"))
    step("'PHP/8.3' (no patch number) is never scored", status_of("PHP/8.3") == [], status_of("PHP/8.3"))
    step("'PHPRocks' is not PHP", not security.detect("<html></html>", {"X-Powered-By": "PHPRocks 2.0"})["php"])
    _, pl = security.assess({}, [{"raw": "<html><body>hi</body></html>", "internal": ["https://a.test/contact.php", "https://a.test/"]}])
    step("the site's own pages ending in .php mean it runs PHP (tatomlending.com shape)", pl["php"] and ".php" in pl["line"] and pl["phpNote"], pl)
    _, pl = security.assess({}, [{"raw": '<html><body><a href="https://other.test/x.php">x</a></body></html>', "internal": ["https://a.test/"]}])
    step("a link to someone else's .php page does not", not pl["php"], pl)
    ck = security.detect("<html></html>", {"Set-Cookie": "PHPSESSID=abc123; path=/"})
    step("a PHPSESSID cookie means PHP; the version stays not measured", ck["php"] and ck["phpVersion"] is None and "cookie" in ck["line"], ck)
    step("'X-Powered-By: Otter-Pops' is not PHP (blueridgepropertiesnc.com)", not security.detect("<html></html>", {"X-Powered-By": "Otter-Pops"})["php"])
    wp_cls = '<html><head><meta name="generator" content="WordPress 6.8"></head><body class="home elementor-kit-13162"><p>We love elementor-kit-9 talk</p></body></html>'
    step("Elementor read from the page's own class names (kristamashore.com shape)",
         security.detect(wp_cls, {})["builders"] == ["Elementor"], security.detect(wp_cls, {})["builders"])
    step("the same words in a sentence are not a builder",
         security.detect('<html><head><meta name="generator" content="WordPress 6.8"></head><body><p>elementor-kit-9 et_pb_section</p></body></html>', {})["builders"] == [])
    for label, bomb in (("unclosed comments", "<!--" * 150000), ("unclosed scripts", "<script>" * 80000),
                        ("unclosed styles", "<style>" * 80000), ("unclosed img tags", "<img src=" * 70000)):
        t0 = time.time()
        security.assess({}, [{"raw": bomb}] * 25)
        step("page bomb, %s on 25 pages: finishes in seconds" % label, time.time() - t0 < 10, time.time() - t0)
    step("stripping keeps script addresses and drops script text",
         security._strip('<!-- /wp-content/x --><script src=/a.js>var w="/wp-content/"</script><style>a{}</style><b>') == ' <script src=/a.js><b>',
         security._strip('<!-- /wp-content/x --><script src=/a.js>var w="/wp-content/"</script><style>a{}</style><b>'))
    platform_cases()
    import test_trust
    test_trust.unit_cases(step)
    test_trust.cases(sys.modules[__name__])

    r = run("big")
    step("1000-page sitemap: capped at %d pages" % grader.MAX_PAGES,
         r["facts"]["pagesChecked"] == grader.MAX_PAGES and r["facts"]["sitemapPages"] == 1000, r["facts"])
    step("1000-page sitemap: the cap is said out loud", status(r, "Pages beyond the first %d" % grader.MAX_PAGES) == "notMeasured")
    step("no time limit unless a front door sets one", grader.CRAWL_SECONDS is None and status(r, "Pages and links past the time limit") is None)
    # The web checker's time budget (2026-10-26): out of time means read in part and say so, still graded.
    grader.CRAWL_SECONDS = 1e-9
    try:
        r = run("big")
    finally:
        grader.CRAWL_SECONDS = None
    step("out of time: stops after the home page, follows no links, says so, and still grades what it read",
         r["facts"]["pagesChecked"] == 1 and r["facts"]["linksChecked"] == 0
         and status(r, "Pages and links past the time limit") == "notMeasured" and r.get("overall") is not None, r["facts"])

    # ---- the grade: one number-to-letter mapping, in one place
    step("grade mapping: 90 A, 80 B, 70 C, 60 D, below 60 F, none '?'",
         "".join(grader.letter(s) for s in (100, 90, 89, 80, 79, 70, 69, 60, 59, 0)) == "AABBCCDDFF" and grader.letter(None) == "?")
    step("no flat cap: the grader has no capped_overall and no overallBeforeCap (owner decision 2026-10-26)",
         not hasattr(grader, "capped_overall") and "overallBeforeCap" not in run("clean"))
    # Jerry 2026-10-26: "every single person Krista checked got an 89". Strong sites under a
    # Google target were all held to 89. Sites that differ must score differently.
    scores = {}
    for a11y in (1.0, 0.96, 0.9, 0.8, 0.6):
        rr = run_lh("clean", fake_lighthouse(lhr({"performance": 0.9, "accessibility": a11y, "best-practices": 1.0, "seo": 1.0})))
        scores[a11y] = (rr["overall"], expected_grade(rr), rr["letter"])
    s = [scores[k][0] for k in (1.0, 0.96, 0.9, 0.8, 0.6)]
    step("strong sites that differ get different scores, falling as accessibility falls, never flattened to 89",
         len(set(s)) == 5 and s == sorted(s, reverse=True) and all(v[0] == v[1] and v[2] == grader.letter(v[0]) for v in scores.values()), scores)
    step("poor accessibility costs a strong site its A (60 out of 100 is not an A)", scores[0.6][2] != "A" and scores[1.0][2] == "A", scores)
    step("a quarter point per point under target: accessibility 80 costs 5 points", abs(grader.google_shortfall({"accessibility": 80}, ["accessibility"]) - 5) < 1e-9)
    step("a score that was not measured costs nothing extra", grader.google_shortfall({"performance": None}, ["performance"]) == 0)

    r = grader.audit("http://127.0.0.1:1/", "dead", lighthouse=False, log=lambda m: None)
    step("nothing listening: 'did not answer'", not r["reachable"] and "did not answer" in r["message"])
    r = grader.audit("not a website", "junk", lighthouse=False, log=lambda m: None)
    step("junk address: refused politely", not r["reachable"] and "does not look like" in r["message"])

    # ---- Google's test with no scores (owner rule 2026-10-19): why, and what it does to the grade
    base = run("clean")
    offs = {}  # each site with Lighthouse turned off: the grade on everything else
    reasons = {}

    def excluded(rep, cause, words, label, site="clean"):
        if site not in offs:
            offs[site] = run_lh(site, fake_lighthouse(_skipped=True, _error="Skipped on request (--no-lighthouse)"))
        base_pub = offs[site]
        why = rep.get("lighthouseUnavailable") or {}
        reasons[cause] = why.get("reason") or ""
        lh_checks = [c for c in rep["checks"] if c["group"].startswith("Google's own test")][:4]
        step("%s: cause '%s', left out of the grade, reason says '%s'" % (label, cause, words),
             why.get("cause") == cause and why.get("effect") == "excluded" and words.lower() in reasons[cause].lower()
             and lh_group(rep)["score"] is None and all(c["status"] in ("notMeasured", "local") for c in lh_checks)
             and all(c["detail"] == why["reason"] for c in lh_checks), (why, [(c["name"], c["status"]) for c in lh_checks]))
        step("%s: graded on everything else, same number as with Lighthouse off, letter from the number" % label,
             rep["overall"] == base_pub["overall"] and rep["letter"] == grader.letter(rep["overall"]),
             (rep["overall"], rep["letter"], base_pub["overall"]))

    step("Lighthouse off: its own reason, left out of the grade",
         (base.get("lighthouseUnavailable") or {}).get("cause") == "skipped" and base["letter"] == "A", base.get("lighthouseUnavailable"))
    r = run_lh("clean", fake_lighthouse(_error="Lighthouse could not run here (no Chrome or Edge found on this computer): x", _noBrowser=True))
    excluded(r, "no-browser", "no Chrome browser on this computer", "checker-side, no Chrome")
    step("checker-side, no Chrome: the report tells them to install it and run again",
         "Install Google Chrome" in report_html.render([r]) and "run the check again" in r["lighthouseUnavailable"]["reason"])
    r = run_lh("clean", fake_lighthouse(LH_403))
    excluded(r, "blocked", "does not affect real visitors", "checker-side, firewall 403s our browser while the site serves pages")
    step("firewall: Lighthouse's own words are kept", "Status code: 403" in (r["lighthouseUnavailable"].get("lighthouseSaid") or ""))
    ok = report_html.esc(report_html.BLOCKED_OK)
    page = report_html.render([r])
    step("firewall: the report says don't worry, in grey, with the run-it-yourself button",
         page.count(ok) == 1 and "notice lh-why calm" in page and "Analyze page load" in page and "lh-why excluded" not in page)
    rb = run_lh("botwall", fake_lighthouse(_error="PageSpeed answered 500"))
    step("checker-side, the plain read is bot-walled too: blocked, reason recorded and shown",
         rb.get("blocked") and (rb.get("lighthouseUnavailable") or {}).get("cause") == "blocked"
         and "turned our checker away" in rb["lighthouseUnavailable"]["reason"]
         and report_html.esc(rb["lighthouseUnavailable"]["reason"]) in report_html.render([rb]), rb.get("lighthouseUnavailable"))
    page = report_html.render([rb])
    step("blocked site: don't worry said once, at the top, in grey, with the run-it-yourself button",
         page.count(ok) == 1 and page.index(ok) < page.index("Google&rsquo;s own test") and '<div class="notice calm">' in page
         and page.count("Analyze page load") == 1)
    r = run_lh("coming-soon", fake_lighthouse(LH_NO_FCP))
    excluded(r, "not-launched", "applies after launch", "not launched, a coming-soon page", "coming-soon")
    step("not launched: shown as 'After launch', never failed",
         all(c["status"] == "local" for c in r["checks"] if c["group"].startswith("Google's own test")))
    r = run_lh("clean", fake_lighthouse(_error="Node is not installed here"), public=False, local=True)
    step("not launched, --local preview: left out, 'applies after launch'",
         (r.get("lighthouseUnavailable") or {}).get("cause") == "not-launched" and lh_group(r)["score"] is None, r.get("lighthouseUnavailable"))
    r = run_lh("clean", fake_lighthouse(LH_HUNG))
    excluded(r, "timeout", "timed out in our checker", "ambiguous: PAGE_HUNG in our browser, plain read loaded fine (bakerroofing)")
    r = run_lh("clean", fake_lighthouse(_error="Lighthouse could not run here (TimeoutError)", _timeout=True))
    step("ambiguous: our checker's own timeout is 'timeout' too, never held against the site",
         (r.get("lighthouseUnavailable") or {}).get("cause") == "timeout" and lh_group(r)["score"] is None, r.get("lighthouseUnavailable"))
    r = run_lh("clean", fake_lighthouse(LH_NO_FCP))
    excluded(r, "checker-page", "loaded normally when we read it", "ambiguous: NO_FCP on a page the plain read found fine")
    r = run_lh("clean", fake_lighthouse(_error="internal Lighthouse call was refused by deployment protection (HTTP 401 from x)"))
    excluded(r, "checker", "problem on our side", "checker-side, anything else (deployment protection)")
    r = run_lh("clean", fake_lighthouse(_error="Protocol error (Runtime.evaluate): Execution context was destroyed."))
    why = r.get("lighthouseUnavailable") or {}
    step("checker-side, a browser crash: plain words for the owner, the raw error kept for whoever fixes it",
         why.get("cause") == "checker" and "lost the page partway through" in why.get("reason", "")
         and "Protocol error" not in why.get("reason", "") and "Protocol error" in (why.get("lighthouseSaid") or ""), why)

    spa_off = run_lh("spa", fake_lighthouse(_skipped=True))
    r = run_lh("spa", fake_lighthouse(LH_NO_FCP))
    why = r.get("lighthouseUnavailable") or {}
    reasons["site-broken"] = why.get("reason") or ""
    lh_checks = [c for c in r["checks"] if c["group"].startswith("Google's own test")][:4]
    step("site-side: page never painted AND the plain read found no words: cause 'site-broken', counted as failures",
         why.get("cause") == "site-broken" and why.get("effect") == "failed" and all(c["status"] == "fail" for c in lh_checks)
         and lh_group(r)["score"] == 0, (why, [(c["name"], c["status"]) for c in lh_checks]))
    step("site-side: says what broke and that it needs fixing",
         "never showed anything on screen" in why.get("reason", "") and "needs fixing" in why.get("reason", "")
         and "NO_FCP" in (why.get("lighthouseSaid") or ""), why)
    step("site-side: the grade is marked down (lower than with Lighthouse off), under every floor, letter from the number",
         r["overall"] < spa_off["overall"] and set(r["belowBar"]) == {"performance", "accessibility", "bestPractices", "seo"}
         and r["letter"] == grader.letter(r["overall"]), (r["overall"], spa_off["overall"], r["belowBar"]))
    step("site-side: listed once in 'Fix these first', not four times",
         sum(1 for c in report_html.top_fixes(r, 50) if c["group"].startswith("Google's own test")) == 1)
    r = run_lh("error500", fake_lighthouse(LH_500))
    step("site-side, unreadable: home page 500 to both reads is 'site-broken', recorded, still no grade",
         (r.get("lighthouseUnavailable") or {}).get("cause") == "site-broken" and not r["reachable"] and "letter" not in r
         and "error 500" in r["lighthouseUnavailable"]["reason"] and "needs fixing" in report_html.render([r]), r.get("lighthouseUnavailable"))
    page = report_html.render([r])
    step("a site that is really broken gets no don't worry", ok not in page and "notice calm" not in page and "lh-why calm" not in page)

    # ---- a security check page is not the site (owner rule 2026-10-19): its scores are never shown
    res = {}
    grader.read_lighthouse(LH_CF_CHALLENGE, res)
    step("challenge page: a Cloudflare 'Just a moment' result is rejected, scores, screenshot and findings dropped",
         res.get("_challenge") == "Cloudflare" and all(res.get(k) is None for k in grader.LH_SCORES + ("screenshot", "lcp"))
         and not res.get("a11yFailed") and not res.get("seoFailed"), res)
    res = {}
    grader.read_lighthouse(LH_REAL_SITE, res)
    step("challenge page: the same site's real Lighthouse result is accepted, scores intact",
         not res.get("_challenge") and (res["performance"], res["accessibility"], res["bestPractices"], res["seo"]) == (56, 86, 79, 100), res)
    one_marker = {
        "orchestrate request only": lh_with(LH_REAL_SITE, ["https://themashoregroup.com/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1?ray=1"]),
        "challenge element only": lh_with(LH_REAL_SITE, snippet='<div id="challenge-stage">', label=""),
        "Cloudflare's wording only": lh_with(LH_REAL_SITE, label="themashoregroup.com\nPerforming security verification"),
        "address carries a challenge token": dict(lh_with(LH_REAL_SITE), finalDisplayedUrl="https://themashoregroup.com/?__cf_chl_rt_tk=x"),
        "Sucuri block page": lh_with(LH_REAL_SITE, label="Sucuri WebSite Firewall - Access Denied"),
        "Akamai block page": lh_with(LH_REAL_SITE, label="You don't have permission to access this server. Reference #18.1 https://errors.edgesuite.net/18.1"),
        "Akamai bot challenge": lh_with(LH_REAL_SITE, ["https://example.com/_sec/cp_challenge/ak-challenge-4-3.htm"]),
        "Imperva block page": lh_with(LH_REAL_SITE, label="Request unsuccessful. Incapsula incident ID: 123-456"),
        "DataDome captcha": lh_with(LH_REAL_SITE, ["https://geo.captcha-delivery.com/captcha/?initialCid=x"]),
        "HUMAN press-and-hold": lh_with(LH_REAL_SITE, snippet='<div id="px-captcha">'),
        "AWS WAF challenge": lh_with(LH_REAL_SITE, ["https://abc.edge.sdk.awswaf.com/abc/def/challenge.js"]),
        "Vercel checkpoint": lh_with(LH_REAL_SITE, label="Vercel Security Checkpoint"),
        "main document 403": lh_with(LH_REAL_SITE, status=403),
        "generic wording on a noindex page": lh_with(LH_REAL_SITE, label="Just a moment...", noindex=True),
    }
    missed = [k for k, v in one_marker.items() if not grader.lighthouse_challenge(v)]
    step("challenge page: each vendor's standard challenge or block page is caught on its own", not missed, missed)
    look_alikes = {
        "Cloudflare bot script on a real page": lh_with(LH_REAL_SITE, ["https://themashoregroup.com/cdn-cgi/challenge-platform/scripts/jsd/main.js",
                                                                       "https://themashoregroup.com/cdn-cgi/challenge-platform/h/b/scripts/jsd/a1b2/main.js"]),
        "Turnstile on a contact form": lh_with(LH_REAL_SITE, ["https://challenges.cloudflare.com/turnstile/v0/api.js",
                                                              "https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/g/orchestrate/chl_api/v1?ray=1"]),
        "Imperva's per-page resource": lh_with(LH_REAL_SITE, ["https://example.com/_Incapsula_Resource?SWJIYLWA=719d34d31c8e3a6e6fffd425f7e032f3"]),
        "DataDome's tag": lh_with(LH_REAL_SITE, ["https://js.datadome.co/tags.js"]),
        "a real loading screen saying 'Just a moment...'": lh_with(LH_REAL_SITE, label="Just a moment..."),
    }
    wrong = [k for k, v in look_alikes.items() if grader.lighthouse_challenge(v)]
    step("challenge page: real pages that merely load a shield's script keep their scores", not wrong, wrong)
    r = run_lh("clean", fake_lighthouse(LH_CF_CHALLENGE))
    why = r.get("lighthouseUnavailable") or {}
    lh_checks = [c for c in r["checks"] if c["group"].startswith("Google's own test")]
    step("challenge page, site readable: cause 'blocked', left out of the grade, no score or finding of the check page",
         why.get("cause") == "blocked" and why.get("effect") == "excluded" and "security check page" in why.get("reason", "")
         and "Cloudflare" in why.get("reason", "") and all(r["lighthouse"][k] is None for k in grader.LH_SCORES)
         and lh_group(r)["score"] is None and not r.get("screenshot") and len(lh_checks) == 4
         and all(c["status"] == "notMeasured" for c in lh_checks), (why, [(c["name"], c["status"]) for c in lh_checks]))
    rb = run_lh("botwall", fake_lighthouse(LH_CF_CHALLENGE))
    page = report_html.render([rb])
    step("challenge page, site bot-walled too: no Google scores, the turned-away reason, no 'still ran' heading",
         rb.get("blocked") and all(rb["lighthouse"][k] is None for k in grader.LH_SCORES) and not rb.get("screenshot")
         and (rb.get("lighthouseUnavailable") or {}).get("cause") == "blocked" and "still ran" not in page
         and report_html.esc(rb["lighthouseUnavailable"]["reason"]) in page, rb.get("lighthouseUnavailable"))
    walled = run("botwall")
    step("every report shape carries the launch targets (bar) and the page caps, the unreadable one included",
         rb.get("bar") == grader.BAR and r.get("bar") == grader.BAR and walled.get("bar") == grader.BAR
         and walled.get("caps") == {"pages": grader.MAX_PAGES, "links": grader.MAX_LINKS})
    shown = dict(rb, lighthouse={"performance": 83, "accessibility": 93, "bestPractices": 71, "seo": 45}, lighthouseUnavailable=None)
    with_bar = report_html.render([shown])
    shown.pop("bar")
    old_json = report_html.render([shown])  # a report saved before every shape carried the bar
    step("report: launch targets in plain words ('Launch target: 85'), never 'our bar', never a label without its number",
         "Launch target: 85" in with_bar and "Launch target: 100" in with_bar and "our bar" not in (with_bar + old_json).lower()
         and "Launch target" not in old_json and not re.search(r"Launch target:\s*<", with_bar),
         re.findall(r".{30}Launch target.{30}", with_bar + old_json))

    r = run_lh("clean", fake_lighthouse(LH_OK))
    step("Lighthouse works: no 'unavailable' reason, its scores are averaged into the grade as before",
         r.get("lighthouseUnavailable") is None and lh_group(r)["score"] == 98 and r["overall"] == expected_grade(r),
         (r.get("lighthouseUnavailable"), lh_group(r)))
    step("every cause has its own reason, none silent, no 'pending', no em dashes",
         len(set(reasons.values())) == len(reasons) == 7 and all(v and "pending" not in v.lower() and "—" not in v for v in reasons.values()),
         reasons)
    step("coming-soon detector: says so in the title or on a short page, not on a long page mentioning it",
         grader.looks_unlaunched("Coming soon", [], "") and grader.looks_unlaunched("Bakery", [], "Our site is under construction.")
         and not grader.looks_unlaunched("Bakery", ["Fresh bread"], PROSE * 10 + " New flavors coming soon."))

    # ---- the site owner's allowlist header (web checker; unset on a person's own computer)
    allowlist_cases()
    guard_cases()

    # ---- the visual report
    hostile = run("hostile")
    hostile["screenshot"] = 'javascript:alert(3)"><script>alert(4)</script>'
    html_out = report_html.render([hostile])
    step("report: hostile page content is escaped", "<script>alert" not in html_out and "onerror=alert" not in html_out.replace("onerror=alert(1)&gt;", ""), re.findall(r".{40}<script>alert.{20}", html_out))
    step("report: non-image screenshot is dropped", "javascript:alert(3)" not in html_out)
    srv1, u1 = serve(clean_site())
    srv2, u2 = serve(messy_site())
    try:
        a = grader.audit(u1, "Yours", lighthouse=False, log=lambda m: None)
        b = grader.audit(u2, "Competitor", lighthouse=False, log=lambda m: None)
    finally:
        srv1.shutdown()
        srv2.shutdown()
    cmp_html = report_html.render([a, b, run("botwall")])
    step("report: comparison shows both sites and the blocked one", cmp_html.count('class="duel-card"') == 3 and "Side by side" in cmp_html and "turned our checker away" in cmp_html)
    step("report: one self-contained file (no external scripts, fonts or styles)", not re.search(r"<script|<link[^>]+stylesheet|https?://fonts\.", cmp_html))
    step("report: the number out of 100 is shown beside the letter",
         ("%s out of 100" % a["overall"]) in cmp_html and 'class="grade-line"' in cmp_html and (">%s<" % a["letter"]) in cmp_html,
         (a["overall"], a["letter"]))

    # ---- the command line, as a person runs it
    srv, url = serve(clean_site())
    out = Path(tempfile.mkdtemp(prefix="wh-test-"))
    try:
        p = subprocess.run([sys.executable, str(HERE / "audit.py"), url, "--no-lighthouse", "--out-dir", str(out)],
                           capture_output=True, text=True, timeout=300)
    finally:
        srv.shutdown()
    m = re.search(r"REPORT: (.+)", p.stdout)
    rep_path = Path(m.group(1).strip()) if m else None
    step("cli: writes report.html and prints its path", p.returncode == 0 and rep_path and rep_path.exists(), p.stdout[-400:] + p.stderr[-400:])
    step("cli: writes the site's JSON beside it", rep_path is not None and any(rep_path.parent.glob("*.json")))
    p = subprocess.run([sys.executable, str(HERE / "audit.py"), "a.com", "b.com", "c.com", "d.com"], capture_output=True, text=True)
    step("cli: more than three addresses refused", p.returncode == 2 and "at most three" in p.stderr)
    p = subprocess.run([sys.executable, str(HERE / "audit.py"), "a.com", "--state", "California"], capture_output=True, text=True)
    step("cli: a state that is not two letters refused", p.returncode == 2 and "two-letter" in p.stderr)
    p = subprocess.run([sys.executable, str(HERE / "audit.py"), "http://127.0.0.1:1", "--no-lighthouse", "--out-dir", str(out)], capture_output=True, text=True, timeout=120)
    step("cli: unreachable site exits 2 and still writes a report", p.returncode == 2 and "REPORT:" in p.stdout)

    print("\n%d failed" % len(FAILS) if FAILS else "\nall passed", flush=True)
    return len(FAILS)


if __name__ == "__main__":
    sys.exit(main())
