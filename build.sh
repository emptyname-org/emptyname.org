#!/usr/bin/env bash
#
# Build emptyname.org into www/public (no deploy).
# A preview server in MEMORY mode (hugo server -M, the documented command) is
# left alone — it never writes to public/. A legacy disk-mode server is stopped:
# it would re-poison public/ with a localhost-baseURL build after we build.
#
# Usage:
#   ./build.sh            build (clean)
#   ./build.sh <flags>    extra flags passed through to hugo
#
set -euo pipefail

PROJECT="$(cd "$(dirname "$0")/www" && pwd)"

for pid in $(pgrep -x hugo 2>/dev/null || true); do
  cmd="$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)"
  case "$cmd" in
    *server*-M*|*server*--renderToMemory*) ;;  # memory mode — harmless, keep it
    *server*)
      echo "▶ Disk-mode preview server (pid $pid) — stopping it (would poison public/)…"
      kill "$pid" || true
      sleep 1 ;;
  esac
done

cd "$PROJECT"
rm -f .hugo_build.lock
echo "▶ Building…"
hugo --gc --minify --cleanDestinationDir "$@"

echo "✔ Built → $PROJECT/public"
