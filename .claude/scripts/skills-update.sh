#!/bin/bash
# skills-update.sh — zero-click instruction updates.
#
# Runs in the background when Claude opens this project (SessionStart hook), at
# most once a day. Pulls Krista's latest SKILLS, RULES and DOCS and commits
# them, so an agent gets improvements without ever asking — the same
# arrangement Agent-Authority-Operating-System uses for its kit.
#
# ---------------------------------------------------------------------------
# WHAT IT CAN AND CANNOT TOUCH, AND WHY THAT IS THE WHOLE DESIGN
#
# It runs `npm run update:skills`, which is scoped to .claude/skills,
# .claude/rules and docs. It CANNOT reach site.config.ts, content/, app/,
# components/, lib/, public/, scripts/ or CLAUDE.md. That is not a convention,
# it is the scope list in scripts/update-engine.mjs.
#
# This matters because the obvious version of this script — one that runs a
# full engine update — is dangerous. Measured on a real site built from this
# seed and then designed, a full apply would have replaced app/globals.css
# (729 lines different), app/page.tsx (422) and app/layout.tsx (63) with the
# seed's generic versions. Nothing automatic should be able to do that.
#
# Skills are instructions to Claude, not the agent's work. Nobody hand-edits
# one, there is nothing of theirs inside to lose, and once the new skills land
# Claude knows how to keep the site current by itself. That is the half worth
# automating and the only half that is safe to.
#
# ---------------------------------------------------------------------------
# FAILS SILENT BY DESIGN
#
# Offline, no git, no node, a dirty tree, a detached HEAD, a conflict: every
# one exits 0 and lets the session start normally. A broken updater must never
# be the reason somebody cannot open their own website. `npm run update:skills`
# still works by hand in every one of those cases.

set -u

# --- locate the site root (this file lives at .claude/scripts/) --------------
ROOT="$(cd "$(dirname "$0")/../.." && pwd)" || exit 0
cd "$ROOT" || exit 0

STATE_DIR=".claude/state"
LOG="$STATE_DIR/last-skills-update.log"
STAMP="$STATE_DIR/last-skills-update.stamp"
LOCK="$STATE_DIR/.skills-update-lock"

# Exactly what update:skills is allowed to write. Used for the dirty-tree guard
# and for the commit, so neither can ever see the agent's own work.
SCOPE=(".claude/skills" ".claude/rules" "docs")

mkdir -p "$STATE_DIR" 2>/dev/null || exit 0
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG" 2>/dev/null; }

# Put the tree back after a failed or out-of-scope update.
#
# MUST be a hard reset, not `git checkout -- .`. `git checkout <ref> -- <path>`
# writes the INDEX as well as the working tree, so checking out "." afterwards
# restores the staged new version and undoes precisely nothing — the damage
# stays, staged and ready to be committed by the next thing that runs. This is
# already documented in scripts/update-engine.mjs and I reproduced it anyway:
# the abort logged "reverting, nothing committed" while leaving every
# overwritten file in place.
#
# Safe because the dirty-tree guard above has already established that the only
# changes present are the ones this script just made.
undo() { git reset -q --hard HEAD 2>/dev/null; }

# --- guards ------------------------------------------------------------------
command -v git  >/dev/null 2>&1 || exit 0
command -v node >/dev/null 2>&1 || { log "SKIP node not installed"; exit 0; }
git rev-parse --git-dir >/dev/null 2>&1 || { log "SKIP not a git repository"; exit 0; }

# Once a day. The hook fires every session; this is what makes it daily.
if [ -f "$STAMP" ] && [ -n "$(find "$STAMP" -mmin -1440 2>/dev/null)" ]; then
  exit 0
fi

# Single-flight lock, stale after 10 minutes.
if [ -d "$LOCK" ]; then
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +10 2>/dev/null)" ]; then
    rmdir "$LOCK" 2>/dev/null
  else
    exit 0
  fi
fi
mkdir "$LOCK" 2>/dev/null || exit 0
trap 'rmdir "$LOCK" 2>/dev/null' EXIT
touch "$STAMP" 2>/dev/null

# Never run over somebody's work in progress. update:skills refuses a dirty
# tree anyway; checking here means the reason lands in the log instead of
# looking like a failure.
#
# This script's OWN bookkeeping under .claude/state/ is excluded, and that
# exclusion is load-bearing: the stamp is written a few lines above, so without
# it the guard trips on the updater's own footprint and the auto-update never
# runs again on any clone where .claude/state/ is not gitignored. Caught on the
# first real run — "SKIP working tree has uncommitted changes" on a tree whose
# only change was the file this script had just created.
if [ -n "$(git status --porcelain -- . ':!.claude/state' 2>/dev/null)" ]; then
  log "SKIP working tree has uncommitted changes — will try again next session"
  exit 0
fi

# Only on their main line. Never auto-commit onto a branch under review.
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
  log "SKIP on branch '$BRANCH' — auto-update only runs on main"
  exit 0
fi

# --- what would change? ------------------------------------------------------
PREVIEW="$(npm run --silent update:skills 2>&1)"
if [ $? -ne 0 ]; then
  log "SKIP preview failed (offline, or the seed is unreachable)"
  exit 0
fi
# The preview heads its list with "FILES (n)". An earlier version grepped for
# a sentence the script does not print, so every run logged "already up to
# date" on a clone that was 21 files behind — a silent no-op that looked
# exactly like success.
if ! printf '%s' "$PREVIEW" | grep -qE "^FILES \([1-9]"; then
  log "OK already up to date"
  exit 0
fi

# --- apply -------------------------------------------------------------------
APPLIED="$(npm run --silent update:skills -- --apply 2>&1)"
if [ $? -ne 0 ]; then
  log "ERROR apply failed — run 'npm run update:skills' by hand to see why"
  printf '%s\n' "$APPLIED" >> "$LOG" 2>/dev/null
  undo
  exit 0
fi

# Belt and braces: the scope list lives in update-engine.mjs, and this is the
# one place a mistake there would become an automatic commit over somebody's
# website. Refuse to commit anything outside the instruction layer.
STRAY="$(git status --porcelain -- . ':!.claude/skills' ':!.claude/rules' ':!docs' ':!.claude/state' ':!.engine-version' 2>/dev/null)"
if [ -n "$STRAY" ]; then
  log "ABORT update touched files outside skills/rules/docs — reverting, nothing committed"
  printf '%s\n' "$STRAY" >> "$LOG" 2>/dev/null
  undo
  exit 0
fi

if [ -z "$(git status --porcelain -- "${SCOPE[@]}" 2>/dev/null)" ]; then
  log "OK nothing changed"
  exit 0
fi

COUNT="$(git status --porcelain -- "${SCOPE[@]}" | wc -l | tr -d ' ')"
git add -- "${SCOPE[@]}" .engine-version 2>/dev/null
git -c user.name="skills-update" \
    -c user.email="skills-update@users.noreply.github.com" \
    commit -q -m "chore: pull latest skills and rules from the seed

$COUNT instruction file(s) updated automatically by
.claude/scripts/skills-update.sh. Only .claude/skills, .claude/rules and
docs can be touched — the site itself is out of scope.

Review with: git show HEAD
Undo with:   git revert HEAD" >/dev/null 2>&1 \
  && log "UPDATED $COUNT file(s), committed $(git rev-parse --short HEAD)" \
  || log "ERROR could not commit (files are staged; commit them by hand)"

{
  echo "--- what arrived ---"
  printf '%s\n' "$PREVIEW" | sed -n '1,40p'
  echo "--- end ---"
} >> "$LOG" 2>/dev/null

log "DONE say 'what did my last update bring in?' for the plain-English version"
exit 0
