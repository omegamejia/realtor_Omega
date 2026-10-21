/**
 * Did the article actually reach the website?
 *
 * THIS EXISTS BECAUSE OF A REAL THIRTEEN-DAY SILENCE. The daily job wrote an
 * article, proved the site still built, and committed it — correctly, every
 * step passing. Nothing deployed, because that site's host had become
 * disconnected from its repository days earlier. Twelve commits sat in the
 * repository and the website never changed, and not one check noticed, because
 * every check was about whether the ARTICLE was good. None was about whether
 * anybody could read it.
 *
 * A commit is not a publication. The job is not done when the file lands; it is
 * done when a stranger can open the page.
 *
 * What this does NOT do: fix the deploy. It cannot. It tells somebody, the next
 * morning, in words that name the actual cause, instead of letting a site look
 * busy for a fortnight while its blog stands still.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The site's own public address, as site.config.ts states it. */
function publicUrl() {
  const src = readFileSync(join(ROOT, "site.config.ts"), "utf8");
  const u = (src.match(/^\s*url:\s*"([^"]*)"/m) || [])[1] || "";
  if (!u) return "";
  // A placeholder is not an address. Same test lib/site-url.ts uses.
  if (/\[|\]/.test(u) || /yourdomain|example\.com/i.test(u)) return "";
  return u.replace(/\/+$/, "");
}

const newest = () => {
  const all = JSON.parse(readFileSync(join(ROOT, "content", "posts-generated.json"), "utf8"));
  return all.length ? all[all.length - 1] : null;
};

const WAIT_MINUTES = Number(process.env.PUBLISH_WAIT_MINUTES || 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const post = newest();
if (!post) {
  console.log("Nothing was published in this run, so there is nothing to verify.");
  process.exit(0);
}

/**
 * Where to look. The declared canonical wins, because that is the address the
 * site tells the world is real and therefore the one worth checking.
 *
 * PUBLISH_CHECK_URL is the fallback for the legitimate case where site.url is
 * deliberately empty: a site that has not been given its own domain yet and
 * relies on the host's generated address. Without it, such a site SKIPS this
 * check and the step passes while verifying nothing — which is how a guardrail
 * becomes decoration. Set it as a repository variable, not a secret; it is a
 * public web address.
 */
const base = publicUrl() || (process.env.PUBLISH_CHECK_URL || "").replace(/\/+$/, "");
if (!base) {
  // Not a failure. A site that has not been given its address yet cannot be
  // checked, and blocking on that would fail every pre-launch site every day.
  console.log(
    "This site has no public address yet — site.config.ts has none and no\n" +
      "PUBLISH_CHECK_URL is set — so whether the article is readable cannot be\n" +
      "checked from here. It is written and committed.\n\n" +
      "To switch this check on, set a repository variable PUBLISH_CHECK_URL to\n" +
      "the address the site actually answers on."
  );
  process.exit(0);
}

const url = `${base}/blog/${post.slug}`;
console.log(`Checking that today's article is readable by a stranger.\n  ${url}\n`);

const deadline = Date.now() + WAIT_MINUTES * 60_000;
let attempt = 0;
let last = "";

while (Date.now() < deadline) {
  attempt++;
  try {
    const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "daily-article-verify" } });
    last = `HTTP ${res.status}`;
    if (res.ok) {
      const html = await res.text();
      // A 200 is not enough. A catch-all route, a custom 404 page or a stale
      // cached index can all answer 200 without the article being there.
      if (html.includes(post.title.slice(0, 40))) {
        console.log(`✓ Live after ${attempt} check(s). The article is on the website.`);
        process.exit(0);
      }
      last = `HTTP 200 but the page did not contain the article's title`;
    }
  } catch (e) {
    last = e.message;
  }
  console.log(`  attempt ${attempt}: ${last} — waiting`);
  await sleep(30_000);
}

/**
 * WHY it is not there, because the two causes need different answers.
 *
 * "Your deploy is broken" and "your address is a different website" look
 * identical from here: both are a 404 on the article. Sending somebody to check
 * their deploy when their domain still points at an old site wastes a morning.
 * So before blaming the deploy, fetch the home page and see whether the address
 * is even serving THIS site.
 */
async function diagnose() {
  try {
    const res = await fetch(base, { redirect: "follow", headers: { "user-agent": "daily-article-verify" } });
    const html = await res.text();
    if (!/\/_next\/|__NEXT_DATA__|next\/static/.test(html)) {
      return (
        `  ${base} IS SERVING A DIFFERENT WEBSITE, not this one.\n\n` +
        `  That is the whole problem, and the deploy is probably fine. This site\n` +
        `  states its address as ${base}, which is where every page tells Google\n` +
        `  the real version lives. Right now that address answers with somebody\n` +
        `  else's site, most likely an older one never switched over.\n\n` +
        `  Fix in this order:\n` +
        `   1. Point that address at this site, or change the address in\n` +
        `      site.config.ts to where this site actually answers.\n` +
        `   2. Re-deploy afterwards. The address is baked in at build time, so a\n` +
        `      build made before the change still carries the old one.\n`
      );
    }
    return (
      `  ${base} is serving this site, but not today's article.\n\n` +
      `  The article is in the repository and the website has not picked it up,\n` +
      `  so whatever copies the files onto the live site has stopped running.\n` +
      `  Nothing else saved recently has gone live either.\n`
    );
  } catch (e) {
    return `  ${base} could not be reached at all (${e.message}).\n`;
  }
}

console.error(
  `\n✗ The article was written and committed, and it is NOT readable at\n` +
    `  this site's own address.\n\n` +
    `  Checked:     ${url}\n` +
    `  Last result: ${last}\n` +
    `  Waited:      ${WAIT_MINUTES} minutes\n\n` +
    (await diagnose())
);
process.exit(1);
