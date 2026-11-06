#!/usr/bin/env node
/**
 * Pull the latest ENGINE from the seed, without touching the owner's own site.
 *
 * A site generated from the template has no shared history with the seed, so
 * there is nothing to merge and no upstream to pull from. But `git checkout
 * <ref> -- <path>` does not care about shared history, so specific paths can be
 * taken from the seed directly.
 *
 * WHICH PATHS: exactly the files listed in the seed's `SEED.sha256`, the
 * seed-managed manifest: the shared engine (ENGINE.sha256, identical in every
 * seed) plus this seed's own shared code, its gate, its launch check and its
 * pages. `lib/seed-id.mjs` says which paths those are, `check-engine.mjs
 * --write` turns them into the manifest, and this script delivers it. Nothing
 * off that list is touched: site.config.ts, content/ and the site's own images
 * and README are never replaced by an update.
 *
 *   npm run update:engine            preview, changes nothing
 *   npm run update:engine -- --apply actually writes
 *   npm run update:skills            the instruction layer only (see below)
 *
 * The preview is the point. An update can add a RULE, and a rule lands on
 * content the owner already wrote, so replacing files silently is how somebody
 * discovers three weeks later that their gate has been failing. This reports
 * what changed in plain language (docs/ENGINE-CHANGELOG.md), flags any engine
 * file they have customised and would lose, and asks.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const REMOTE = "seed";
const REF = `${REMOTE}/main`;
const MANIFEST = "SEED.sha256";
const APPLY = process.argv.includes("--apply");
/** Instruction layer only: skills, rules and docs. See INSTRUCTION_LAYER. */
const SKILLS_ONLY = process.argv.includes("--skills");
/** Print the instruction layer, one path per line, and stop. Read by
 *  .claude/scripts/skills-update.sh so its guard and this scope are one list. */
const PRINT_SCOPE = process.argv.includes("--print-scope");

const git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();

/**
 * THIS seed's repository, never a sibling's.
 *
 * Pointing an update at the wrong seed delivers another industry's skills and
 * rules to the site, so the address is not written here: this file is the same
 * in every seed. It comes from, in order:
 *
 *   1. SEED_REPO in the environment, for testing against a fork;
 *   2. SEED_REPO in lib/seed-id.mjs, the seed's own constants;
 *   3. the `seed` remote a previous update already added, for a site whose
 *      lib/seed-id.mjs predates that constant.
 */
async function seedRepo() {
  if (process.env.SEED_REPO) return process.env.SEED_REPO;
  try {
    const ids = await import(new URL("../lib/seed-id.mjs", import.meta.url).href);
    if (typeof ids.SEED_REPO === "string" && ids.SEED_REPO) return ids.SEED_REPO;
  } catch {
    /* no constants file: fall through to the remote */
  }
  try {
    return git("remote", "get-url", REMOTE);
  } catch {
    return "";
  }
}

/**
 * Reject a flag this version does not understand, instead of ignoring it.
 *
 * Silently ignoring an unknown flag is how `npm run update:skills` came to
 * run the FULL engine update on sites whose copy of this file predated
 * --skills: the flag meant nothing, so the script did the wide thing under
 * the name of the narrow one. Failing loudly turns that into a message.
 */
async function rejectUnknownFlags() {
  const known = new Set(["--apply", "--skills", "--force", "--print-scope"]);
  const unknown = process.argv.slice(2).filter((a) => a.startsWith("--") && !known.has(a));
  if (!unknown.length) return;
  const repo = (await seedRepo()) || "<this seed's repository>";
  console.error(
    `\nThis version does not understand ${unknown.join(", ")}.\n\n` +
      "Your copy of scripts/update-engine.mjs is older than the command you ran.\n" +
      "Update it first, then try again:\n\n" +
      `  git fetch ${repo} main\n` +
      "  git checkout FETCH_HEAD -- scripts/update-engine.mjs\n"
  );
  process.exit(1);
}

/** Records the seed commit the engine last came from, so the next update can
 *  tell "the seed changed this" apart from "the owner changed this". */
const STAMP = ".engine-version";
const CHANGELOG = "docs/ENGINE-CHANGELOG.md";

/**
 * THE INSTRUCTION LAYER: `npm run update:skills`.
 *
 * The full update replaces shared app code too, and that is where the danger
 * is. Measured on a real site built from a seed and then designed: a full
 * apply with no record of what was theirs would have overwritten
 * app/globals.css (729 lines different), app/page.tsx (422) and app/layout.tsx
 * (63) with the seed's generic versions. Months of design work, gone to a
 * command that announced itself as an update. That is why the full update
 * judges every file against this site's SEED.sha256 before touching it.
 *
 * This scope is the part that is safe to replace without asking and carries
 * almost all of the value: the skills, the rules and the docs. Nobody
 * hand-edits a skill file (they are the seed's instructions to Claude, not the
 * owner's site), so there is nothing of theirs to lose, and once the new skills
 * land Claude knows how to keep the site current by itself. On the first real
 * site checked, these were 2,895 lines behind the seed.
 *
 * What is deliberately NOT here:
 *   CLAUDE.md   genuinely site-customised: 69 lines added and 129 removed on
 *               the one site measured. Overwriting it loses their own notes.
 *   scripts/    the gate, but also where a site keeps bespoke tooling.
 *   app/ components/ lib/ public/   their site. Never.
 *
 * `.claude/scripts` is in scope because the auto-updater lives there and
 * otherwise could never reach an existing site: the mechanism cannot deliver
 * itself. Nothing in that folder is owner-authored; it is the background
 * updater and nothing else. `.claude/settings.json` and `package.json` stay
 * OUT, because those carry the owner's own permissions and dependencies: the
 * `site-updates` skill adds the two missing entries by hand instead, which is
 * a merge rather than a replacement.
 *
 * .claude/scripts/skills-update.sh commits only what is on this list, and reads
 * it from here (`--print-scope`), so the two can never disagree again. They did:
 * its own copy left out .claude/scripts and this file, so the first update that
 * touched either was reverted, silently, every day.
 *
 * A skill the owner has that the seed does not (a bespoke pipeline, say) is
 * untouched: `git checkout <ref> -- <path>` only writes files that
 * exist in the seed, and never deletes. Verified on a real site: 16 files
 * updated, 0 deleted, every bespoke skill intact.
 */
const INSTRUCTION_LAYER = [
  ".claude/skills",
  ".claude/rules",
  ".claude/scripts",
  "docs",
  // The updater updates itself, and this is not optional.
  //
  // An old copy does not understand `--skills` and silently IGNORES it, so
  // `npm run update:skills` on a site that has not had this file runs the
  // FULL engine update (the wide one) under the name of the safe command.
  // Verified on a real old clone.
  //
  // One file, not the whole of scripts/: the rest is the gate and whatever
  // bespoke tooling a site has grown.
  "scripts/update-engine.mjs",
];

/**
 * THE SCOPE: every path in the seed's SEED.sha256, plus the manifest itself,
 * so the site's own `check:engine` compares against the files it just got.
 *
 * Read from the SEED's manifest, not this site's, so a file the seed has just
 * started delivering reaches the site in the same update. Falls back to the
 * local manifest only when the seed has none, and refuses when neither exists:
 * an update with no list of what it may touch must not guess one.
 */
/** `sha256  path` lines into a Map of path to hash. */
function parseManifest(text) {
  const out = new Map();
  for (const line of text.split("\n")) {
    const m = line.trim().match(/^([0-9a-f]{64})\s+(.+)$/);
    if (m) out.set(m[2], m[1]);
  }
  return out;
}

function seedManifest() {
  try {
    return parseManifest(git("show", `${REF}:${MANIFEST}`));
  } catch {
    return new Map();
  }
}

const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");

function engineScope() {
  let paths = [...seedManifest().keys()];
  if (!paths.length && existsSync(MANIFEST)) {
    paths = [...parseManifest(readFileSync(MANIFEST, "utf8")).keys()];
  }
  if (!paths.length) {
    console.error(
      `\nNo ${MANIFEST} in the seed or here, so there is no list of engine files to\n` +
        "update. Nothing was changed."
    );
    process.exit(1);
  }
  return [...new Set([...paths, MANIFEST])];
}

/**
 * NEVER touched. This is the owner's actual site: their facts and their words.
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

/**
 * Does the stamp name a commit this clone actually has? A stamp can outlive its
 * commit (a seed history rewrite, a shallow fetch), and every comparison
 * against a commit that is not there fails.
 */
function hasBaseline(stamp) {
  if (!stamp?.commit) return false;
  try {
    // Quiet: a missing commit is an expected answer here, not an error to print.
    execFileSync("git", ["cat-file", "-e", `${stamp.commit}^{commit}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Which of these files has the owner changed themselves? An update overwrites
 * them, so they are the only real conflict this script can detect.
 *
 * Returns { edited, unknown }, or null for "cannot tell at all", in which case
 * the caller takes the safe add-only path.
 *
 * JUDGED AGAINST THIS SITE'S OWN SEED.sha256 when it has one: the hash of
 * every seed-managed file as this site last received it. A file that still has that
 * hash is untouched and safe to replace; one that does not was edited here. A
 * file the record does not cover is `unknown` and is kept.
 *
 * The stamp commit is the fallback for a site that predates the manifest, and
 * it is a weaker baseline. It compares against the SEED's commit, so after an
 * add-only update (files kept, stamp written anyway) every file the seed had
 * since changed read as "you edited this", and every later update refused.
 * Found by running this against a real copy of a seed, not by reading it. And
 * a stamp whose commit this clone does not have used to read as "no
 * conflicts", because every git error below was swallowed as "file did not
 * exist then"; it is now null, so the add-only path runs.
 */
function localEdits(paths, stamp) {
  const files = paths.filter((f) => f !== MANIFEST);
  if (existsSync(MANIFEST)) {
    const mine = parseManifest(readFileSync(MANIFEST, "utf8"));
    if (mine.size) {
      return {
        edited: files.filter((f) => mine.has(f) && existsSync(f) && sha(f) !== mine.get(f)),
        unknown: files.filter((f) => !mine.has(f) && existsSync(f)),
      };
    }
  }
  if (!hasBaseline(stamp)) return null;
  const edited = [];
  for (const f of files) {
    try {
      if (git("diff", "--name-only", stamp.commit, "--", f)) edited.push(f);
    } catch {
      /* file did not exist at that commit; not a conflict */
    }
  }
  return { edited, unknown: [] };
}

function readStamp() {
  if (!existsSync(STAMP)) return null;
  try {
    return JSON.parse(readFileSync(STAMP, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  await rejectUnknownFlags();
  if (PRINT_SCOPE) {
    console.log(INSTRUCTION_LAYER.join("\n"));
    return;
  }
  if (!existsSync(".git")) {
    console.error("Run this from the root of your site (the folder with .git in it).");
    process.exit(1);
  }
  // `.claude/state/` is per-clone bookkeeping: the auto-updater's log and its
  // once-a-day stamp. It is excluded deliberately, and the exclusion is
  // load-bearing: the background updater writes its stamp before calling this,
  // so without it every automatic run refuses with "you have uncommitted
  // changes" about a file the updater itself had just created, and the
  // auto-update silently never runs on any clone where it is not gitignored.
  if (git("status", "--porcelain", "--", ".", ":!.claude/state")) {
    console.error(
      "You have uncommitted changes. Commit or stash them first, so that if you\n" +
        "do not like this update you can undo it cleanly."
    );
    process.exit(1);
  }

  const remotes = git("remote").split("\n");
  if (!remotes.includes(REMOTE)) {
    const repo = await seedRepo();
    if (!repo) {
      console.error(
        "\nThis site does not say which seed it came from (no SEED_REPO in\n" +
          "lib/seed-id.mjs, and no `seed` remote), so there is nowhere safe to\n" +
          "update from. Nothing was changed."
      );
      process.exit(1);
    }
    git("remote", "add", REMOTE, repo);
  }
  git("fetch", "--quiet", REMOTE);

  const scope = SKILLS_ONLY ? INSTRUCTION_LAYER : engineScope();
  const changed = scope.filter((p) => {
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
    // Counted separately, because they ask different things of the owner. A
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
  // In --skills mode the record (SEED.sha256) is the only judge. Skills and
  // rules carry nothing of the owner's (see INSTRUCTION_LAYER), so without a
  // record nothing is judged: the stamp fallback would call every skill the
  // seed changed since an add-only run an owner's edit, and refuse.
  const judged =
    SKILLS_ONLY && !existsSync(MANIFEST) ? { edited: [], unknown: [] } : localEdits(files, stamp);
  const edited = judged === null ? null : judged.edited;
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
    /**
     * REFUSE, rather than warn and do it anyway.
     *
     * This printed the list above and then overwrote every one of them. A
     * warning that proceeds is not a guard; it is a receipt, handed over
     * after the fact, to somebody who has already lost their work.
     *
     * It matters more now than it did: the background updater writes
     * `.engine-version`, and the presence of a stamp is what switches OFF the
     * add-only protection for a full engine run. So on any site the auto
     * updater has touched, a later `update:engine -- --apply` was free to
     * replace a designed homepage with the seed's.
     *
     * `--force` is there because folding changes in by hand and then applying
     * is a real workflow. It has to be typed.
     */
    if (APPLY && !process.argv.includes("--force")) {
      console.error(
        "\n" + "=".repeat(72) + "\n" +
          "STOPPED. Nothing was changed.\n" + "=".repeat(72) + "\n\n" +
          `Those ${edited.length} file(s) are yours: you edited them after the last\n` +
          "update, and applying would replace them with the seed's versions.\n\n" +
          "  • To update only the SKILLS, RULES and DOCS, which can never touch\n" +
          "    your site:            npm run update:skills -- --apply\n" +
          "  • To take the new version of a single file, ask Claude for that file.\n" +
          "  • If you genuinely want all of it, including losing those edits:\n" +
          "                          npm run update:engine -- --apply --force\n"
      );
      process.exit(1);
    }
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
    // Name the command they actually ran. In --skills mode this used to tell
    // them to run update:engine, which is the wide one this exists to avoid.
    console.log(
      `To apply:  npm run ${SKILLS_ONLY ? "update:skills" : "update:engine"} -- --apply`
    );
    console.log("-".repeat(72) + "\n");
    return;
  }

  /**
   * WITHOUT A BASELINE, NEVER REPLACE SITE CODE THAT ALREADY EXISTS.
   *
   * `localEdits()` can only spot the owner's own changes against this site's
   * record (SEED.sha256), or failing that a stamp whose commit this
   * clone still has. Without either it returns null, and this used to
   * overwrite everything anyway, treating "we cannot tell whether this is
   * yours" as "it is not yours." On a designed site that is destructive, not
   * merely risky (see the measurements above).
   *
   * So a clone with no baseline gets the safe half: add what the seed has
   * added, touch nothing that already exists, and write the record so the next
   * update can tell the difference properly.
   *
   * THE INSTRUCTION LAYER IS THE EXCEPTION. Treating it the same way was wrong:
   * on the first real site this ran against it updated three docs and NONE of
   * the skills, because every skill file already existed, while that site was
   * 2,895 lines behind on exactly those files. Skills and rules carry nothing
   * of the owner's, and leaving them stale defeats the point. So `--skills`
   * replaces; a full engine run on an unstamped clone does not.
   */
  const unstamped = edited === null && !SKILLS_ONLY;
  const FORCE = process.argv.includes("--force");
  let additions;
  let skipped;
  if (SKILLS_ONLY) {
    additions = changed;
    skipped = [];
  } else if (unstamped) {
    additions = files.filter((f) => !existsSync(f));
    skipped = files.filter((f) => existsSync(f));
  } else {
    // Files the record does not cover are kept unless --force says otherwise.
    skipped = FORCE ? [] : judged.unknown;
    additions = files.filter((f) => !skipped.includes(f));
  }

  if (skipped.length) {
    console.log("\n" + "=".repeat(72));
    console.log(`KEPT YOURS (${skipped.length})`);
    console.log("=".repeat(72));
    console.log(
      "\nThis site's record (SEED.sha256) does not cover these, so there is\n" +
        "no way to tell a file the seed changed from one you changed. Rather than\n" +
        "guess, these were LEFT EXACTLY AS THEY ARE:\n"
    );
    for (const f of skipped.slice(0, 25)) console.log(`    ${f}`);
    if (skipped.length > 25) console.log(`    ...and ${skipped.length - 25} more`);
    console.log(
      "\nAsk Claude to go through these one at a time if you want the newer version\n" +
        "of any of them. Every file this update did take is now on the record, so\n" +
        "the next update can replace those safely on its own."
    );
  }

  if (additions.length) git("checkout", REF, "--", ...additions);
  else if (unstamped) console.log("\nNothing new to add: every engine file already exists here.");

  // THIS SITE'S RECORD: the seed's line for every seed-managed file this site
  // now holds exactly, and no line for a file it kept. The record is what the
  // next update judges "did the owner change this?" against, so it may only
  // claim what is true. (The seed's whole manifest, taken as is, would claim
  // the kept files were current, and the next update would then call every one
  // of them an owner's edit.)
  if (!SKILLS_ONLY) {
    const seed = seedManifest();
    if (seed.size) {
      const lines = [...seed]
        .filter(([f, h]) => existsSync(f) && sha(f) === h)
        .map(([f, h]) => `${h}  ${f}`)
        .sort((a, b) => a.slice(66).localeCompare(b.slice(66)));
      writeFileSync(MANIFEST, lines.join("\n") + "\n");
      git("add", "--", MANIFEST);
    }
  }

  // Stamp what we just took, so the next update can tell the owner's own edits
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

await main();
