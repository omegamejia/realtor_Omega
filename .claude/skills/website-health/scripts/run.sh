#!/bin/bash
# run.sh : the entry point for the website health check, on Mac, Windows (Git Bash) and Linux.
#   bash run.sh <url> [<url2> <url3>] [--industry X] [--state CA] [--out-dir DIR] [--open]
# Finds a working Python 3 (the Windows Store "python3" stub does not count), puts a
# private Node in the home folder the first time and fetches Google's Lighthouse test once
# (no admin, about 40 MB plus Lighthouse, skipped quietly if it fails), then runs audit.py.
# Read-only against the website: it never submits a form, signs in, or changes anything.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"

PY=""
for c in python3 python "py -3"; do
  if command -v "${c%% *}" >/dev/null 2>&1 && $c -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' >/dev/null 2>&1; then PY="$c"; break; fi
done
if [ -z "$PY" ]; then
  echo "I could not run the website check because Python 3.9 or newer is not installed on this computer. Tell me \"run a diagnostic\" and I will help fix that."
  exit 3
fi

if [ "${WEBSITE_HEALTH_SKIP_NODE:-0}" != "1" ]; then
  $PY "$HERE/get_node.py" --warm >/dev/null 2>&1 || true
fi

exec $PY "$HERE/audit.py" "$@"
