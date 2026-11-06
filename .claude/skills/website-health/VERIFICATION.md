# website-health v1.1: verification log (app-blueprint Phase 2)

Built 2026-10-24 in the kit (kit-canonical). Scan first: `skill-check.sh` found `website-health` itself (both kits, TeamOS, vault) and Jerry's `security.py` in the hosted Ranker repo; verdict: extend `security.py`, no second module. Rule: `ranker-what-not-how.md` (vault).

## Working means
Same engine, two doors. Inside BOSS the report offers fixes. With `--public` the report a stranger gets says what is wrong, never how to fix it: counts and categories only, no plugin, theme or version, no CVE number, no fix sentence; the owner's emailed copy (first address only) adds the exact names, versions and who holds the web address, still with no fix line. New areas, each read from the outside and each "not measured" when unreadable: security score, ownership (RDAP), email trust (DMARC, SPF; DKIM never), AI readiness, looked after. A who-are-you choice sets the trade rules. The PHP red flag (no versions, no host questions) is unchanged.

## Fresh-eyes review (two passes, separate Opus reviewers, no build context)
- Pass 1: 8 must-fix. Expired certificate read as "not measured"; plugin CVE number leaked into the public view; "an upgrade fixes it" and "ask the host" sentences in red flags and in details, public and owner; ownership and email read from the wrong party's records on brokerage and country subdomains; page-chosen script addresses could reach this computer; `--who local-service` discarded an explicit `--industry`; five new areas swung the grade a letter on one DNS record and two grade-protection tests had been loosened; the owner's HTML copy lacked the ownership facts.
- Pass 2 (verifying fixes with a real expired certificate, real redirects, a loopback server): 5 new must-fix. The owner copy listed a competitor's plugin versions in a comparison run; the script weight request followed a redirect to an inward name; older checks' explanations and trade-rule sentences still told the reader what to do; two DMARC or SPF records were reported as "no record"; the public check asked for two unlinked admin files. All fixed. Fixes: owner copy for the first address only; the weight request is one HEAD to the vetted address, never redirected, numeric spellings refused, the certificate socket connects to the vetted address; older checks' `why` is dropped and guidance sentences removed from details in public and owner copy; the two-record wording; the public check no longer asks for the admin files (inside BOSS it still does).
- Every one has a case in `test_trust.py` and was watched failing against a deliberately broken copy (expired certificate to None; `owns_apex` always true; `public_ips` accepting inward addresses; numeric spellings accepted; trust areas counted separately; CVE left in the public why; owner copy for competitors; public asking the admin files; guidance left in details).

## Proof
`python3 test_engine.py` (the original 187 plus the trust cases, 348 in all, no internet): all passed. `python3 test_trust.py` (pure cases): 0 failed. Two original grade-protection tests were rewritten, not loosened: the hidden-versions test now asserts the only new security rows are the two WordPress ones and that no other area moves; a separate test asserts the grade counts the five new areas as one area.

Real-world runs (read-only, once each): kristamashore.ai with `--public` (real RDAP, DNS over HTTPS, certificate): found the 308 redirect false positive (Python before 3.11 does not follow 308), fixed and tested; realtor-site-seed.vercel.app: found email and domain records read from the hosting company, fixed and tested; and measured the template itself (81, B, an unfilled template with placeholders and a hidden-from-search setting), which is why it was NOT saved as the "rebuilt site" comparison.

## Not verified, stated
- No finished, live, seed-built site exists to measure, so `reference/seed-site.json` is not shipped and the side-by-side section is left out of the public report until `audit.py <url> --save-reference` is run on one. The talk-to-us button reads `reference/cta.json` (set to the company website; Krista or Jerry should set the address they want).
- Windows. Lighthouse paths (all runs used --no-lighthouse). Registries other than Verisign RDAP. A certificate with fewer than 30 days left (only the expired case was seen live).
- The hosted Ranker's server side: how it replaces `is_private_host` and pins addresses for the audited site's own redirects (the older name-based guard is unchanged; the new requests use the resolved, vetted address).

## Decisions left to the owner
1. The PHP flag says "security issues and breaches"; the 2026-10-24 rule says never say "breached". The flag was required to stay unchanged, so it is.
2. Weight: the five new areas count as one area of the grade.
3. Whether asking for wp-login.php and xmlrpc.php counts as ordinary or as probing. The public check now does not ask; BOSS still does on the owner's own site.

Status: DONE
