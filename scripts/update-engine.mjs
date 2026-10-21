#!/usr/bin/env node
/**
 * Pull the latest ENGINE from the seed, without touching the agent's own site.
 *
 * A site generated from the template has no shared history with the seed, so
 * there is nothing to merge and no upstream to pull from. But `git checkout
 * <ref> -- <path>` does not care about shared history, so specific paths can be
 * taken from the seed directly.
 *
 * The whole design rests on one line already true of this project: the agent's
 * site is site.config.ts and content/, and everything else is the engine. That
 * separation is what makes an update safe.
 *
 *   npm run update:engine            preview, changes nothing
 *   npm run update:engine -- --apply actually writes
 *
 * The preview is the point. An update can add a RULE, and a rule lands on
 * content the agent already wrote — so replacing files silently is how somebody
 * discovers three weeks later that their gate has been failing. This reports
 * what changed in plain language (docs/ENGINE-CHANGELOG.md), flags any engine
 * file they have customised and would lose, and asks.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// The seed moved to the Krista-Mashore-Coaching organization. GitHub redirects
// the old address, but a redirect is not a promise, so point at the real one.
const SEED_REPO = "https://github.com/Krista-Mashore-Coaching/realtor-site-seed.git";
const REMOTE = "seed";
const REF = `${REMOTE}/main`;
const APPLY = process.argv.includes("--apply");
/** Records the seed commit the engine last came from, so the next update can
 *  tell "the seed changed this" apart from "the agent changed this". */
const STAMP = ".engine-version";
const CHANGELOG = "docs/ENGINE-CHANGELOG.md";

/** Shared machinery. Safe to replace: none of it is agent-specific. */
const ENGINE = [
  "components",
  "lib",
  "scripts",
  ".claude",
  "app/globals.css",
  "app/layout.tsx",
  "app/page.tsx",
  "app/process",
  "app/areas",
  "app/buyers",
  "app/sellers",
  "app/blog",
  "app/team",
  "app/listings",
  "app/ai-brief",
  "app/contact",
  "app/free",
  "app/api",
  "app/sitemap.ts",
  "app/robots.ts",
  "app/not-found.tsx",
  "docs",
  "CLAUDE.md",
  // The automated checks and the weekly report job. Without this an existing
  // site could never receive them: an agent would run update:engine, be told it
  // was up to date, and still have no Monday report — because the job lives
  // here and nowhere else.
  ".github/workflows",
];

/**
 * NEVER touched. This is the agent's actual site: their facts and their words.
 * Kept as an explicit list rather than an exclude pattern, because the failure
 * mode here is silently overwriting somebody's business.
 */
const THEIRS = [
  "site.config.ts",
  "content/",
  "public/images/",
  ".env.local",
  "README.md",
];

const git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();

/** What the seed says about this update, in words rather than file paths. */
function changelogSince(stamp) {
  let text;
  try {
    text = git("show", `${REF}:${CHANGELOG}`);
  } catch {
    return null;
  }
  const entries = text.split(/\n(?=## \d{4}-\d{2}-\d{2})/).filter((e) => e.startsWith("## "));
  if (!stamp?.date) return entries.slice(0, 3);
  return entries.filter((e) => (e.match(/## (\d{4}-\d{2}-\d{2})/) || [])[1] > stamp.date);
}

/** Engine files the agent has edited themselves. An update overwrites these, so
 *  they are the only real conflict this script can detect, and it can only do it
 *  when a previous update left a stamp to compare against. */
function localEdits(paths, stamp) {
  if (!stamp?.commit) return null;
  const out = [];
  for (const f of paths) {
    try {
      if (git("diff", "--name-only", stamp.commit, "--", f)) out.push(f);
    } catch {
      /* file did not exist at that commit; not a conflict */
    }
  }
  return out;
}

function readStamp() {
  if (!existsSync(STAMP)) return null;
  try {
    return JSON.parse(readFileSync(STAMP, "utf8"));
  } catch {
    return null;
  }
}

function main() {
  if (!existsSync(".git")) {
    console.error("Run this from the root of your site (the folder with .git in it).");
    process.exit(1);
  }
  if (git("status", "--porcelain")) {
    console.error(
      "You have uncommitted changes. Commit or stash them first, so that if you\n" +
        "do not like this update you can undo it cleanly."
    );
    process.exit(1);
  }

  const remotes = git("remote").split("\n");
  if (!remotes.includes(REMOTE)) git("remote", "add", REMOTE, SEED_REPO);
  git("fetch", "--quiet", REMOTE);

  const changed = ENGINE.filter((p) => {
    try {
      return git("diff", "--name-only", REF, "--", p).length > 0;
    } catch {
      return false;
    }
  });

  if (!changed.length) {
    console.log("Already up to date. Nothing in the engine has changed.");
    return;
  }

  const files = git("diff", "--name-only", REF, "--", ...changed).split("\n").filter(Boolean);
  const stamp = readStamp();

  // ---- What changed, in words ----------------------------------------------
  const entries = changelogSince(stamp);
  if (entries && entries.length) {
    console.log("\n" + "=".repeat(72));
    console.log("WHAT CHANGED");
    console.log("=".repeat(72));
    for (const e of entries) {
      const title = (e.match(/## (.+)/) || [])[1] || "";
      console.log(`\n${title}`);
      for (const m of e.matchAll(/### `(\w+)` . (.+)/g)) {
        console.log(`   [${m[1].toUpperCase().padEnd(9)}] ${m[2]}`);
      }
    }
    // Counted separately, because they ask different things of the agent. A
    // `decision` is a question for them, not a rule their pages have to meet,
    // and lumping the two together told people their pages might be affected
    // when nothing about their pages had changed.
    const all = entries.join("\n");
    const content = (all.match(/### `content`/g) || []).length;
    const decisions = (all.match(/### `decision`/g) || []).length;
    const asks = [
      content && `${content} may flag pages you have already written`,
      decisions && `${decisions} ${decisions === 1 ? "asks" : "ask"} you to make a choice`,
    ].filter(Boolean);
    if (asks.length) {
      console.log(
        `\n   Of these, ${asks.join(", and ")}.` +
          `\n   Read docs/ENGINE-CHANGELOG.md, or ask Claude to walk you through it.`
      );
    }
  } else if (entries === null) {
    console.log("\n(No changelog in the seed yet, so this is a file list only.)");
  }

  // ---- Conflicts: engine files THEY have edited -----------------------------
  console.log("\n" + "=".repeat(72));
  console.log("CONFLICTS WITH YOUR SITE");
  console.log("=".repeat(72));
  const edited = localEdits(files, stamp);
  if (edited === null) {
    console.log(
      "\n  Cannot tell yet. This site has no record of which engine version it\n" +
        "  came from, so there is no baseline to compare against. If you have\n" +
        "  edited anything outside site.config.ts and content/, check `git diff`\n" +
        "  after applying. From this update onward the record is kept for you."
    );
  } else if (edited.length) {
    console.log(
      `\n  ${edited.length} engine file(s) you changed yourself would be OVERWRITTEN:\n`
    );
    for (const f of edited) console.log(`    ${f}`);
    console.log(
      "\n  Commit first and nothing is lost, or ask Claude to fold your changes\n" +
        "  into the new version before applying."
    );
  } else {
    console.log("\n  None. You have not customised any engine file this update replaces.");
  }

  // ---- The file list last, because it is the least useful part --------------
  console.log("\n" + "=".repeat(72));
  console.log(`FILES (${files.length})`);
  console.log("=".repeat(72) + "\n");
  for (const f of files.slice(0, 40)) console.log(`  ${f}`);
  if (files.length > 40) console.log(`  ...and ${files.length - 40} more`);

  console.log("\nUntouched, because this is your site and not the engine:");
  for (const t of THEIRS) console.log(`  ${t}`);

  if (!APPLY) {
    console.log("\n" + "-".repeat(72));
    console.log("This was a PREVIEW. Nothing on your site was changed.");
    console.log("To apply:  npm run update:engine -- --apply");
    console.log("-".repeat(72) + "\n");
    return;
  }

  git("checkout", REF, "--", ...changed);

  // Stamp what we just took, so the next update can tell the agent's own edits
  // apart from the seed's. Without this the conflict check has no baseline.
  const commit = git("rev-parse", REF);
  let date = new Date().toISOString().slice(0, 10);
  try {
    date = git("show", "-s", "--format=%cs", REF);
  } catch {
    /* fall back to today */
  }
  writeFileSync(STAMP, JSON.stringify({ commit, date, updated: date }, null, 2) + "\n");

  console.log("\nUpdated. Your config and content were not touched.");
  console.log("\nNext, in order:");
  console.log("  1. npm install                 in case dependencies moved");
  console.log("  2. npm run dev                 then, in another terminal:");
  console.log("  3. npm run gate                THIS IS THE IMPORTANT ONE");
  console.log("");
  console.log("     A new rule can flag pages you wrote months ago. That is the");
  console.log("     gate working, not the update breaking something. Anything it");
  console.log("     reports, ask Claude to explain before you change anything.");
  console.log("");
  // The update is STAGED (git checkout <ref> -- <path> writes the index too), so
  // `git checkout .` restores the staged new version and undoes nothing. That
  // was the advice here, and a session following it would have kept the update.
  console.log("  4. git diff --staged           see exactly what changed");
  console.log("  5. commit when happy. To undo all of it instead:");
  console.log(`       git reset --hard && rm ${STAMP}\n`);
}

main();
