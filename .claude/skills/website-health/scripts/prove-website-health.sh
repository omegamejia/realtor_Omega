#!/bin/bash
# prove-website-health.sh : try to break the website health check, with no internet needed.
# Fake sites served from this computer, each built to trip specific checks (or none):
# Fair Housing, lending, dental and contractor rules by state, bot shields, gzip,
# JavaScript-only pages, a 1000-page sitemap, hostile page content in the report.
# Exit code = number of failed cases. Add --lighthouse to also run Google's test.
HERE="$(cd "$(dirname "$0")" && pwd)"
PY=""
for c in python3 python "py -3"; do
  if command -v "${c%% *}" >/dev/null 2>&1 && $c -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' >/dev/null 2>&1; then PY="$c"; break; fi
done
[ -n "$PY" ] || { echo "Python 3.9+ not found"; exit 3; }
exec $PY "$HERE/test_engine.py" "$@"
