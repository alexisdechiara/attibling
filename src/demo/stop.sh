#!/usr/bin/env bash
# Stops the Ghost started by start.sh (SIGTERM, then SIGKILL after 30 s). Safe to run when nothing runs.
# Usage: npm run demo:stop
set -uo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/env.sh"

PID=""
[ -f "$WORK/ghost.pid" ] && PID="$(cat "$WORK/ghost.pid")"
if [ -z "$PID" ] || ! kill -0 "$PID" 2>/dev/null; then
  PID=""
  # Fallback: what listens on port 2368, if it is a Ghost (current/index.js).
  if command -v lsof >/dev/null 2>&1; then
    CAND="$(lsof -ti tcp:2368 -sTCP:LISTEN 2>/dev/null | head -1 || true)"
    if [ -n "$CAND" ] && ps -p "$CAND" -o command= 2>/dev/null | grep -q "current/index.js"; then PID="$CAND"; fi
  fi
fi
if [ -z "$PID" ]; then
  echo "Ghost n'est pas lancé."
  rm -f "$WORK/ghost.pid"
  exit 0
fi
kill -TERM "$PID" 2>/dev/null || true
i=0
while [ "$i" -lt 30 ]; do
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "Ghost arrêté."
    rm -f "$WORK/ghost.pid"
    exit 0
  fi
  sleep 1
  i=$((i + 1))
done
kill -KILL "$PID" 2>/dev/null || true
rm -f "$WORK/ghost.pid"
echo "Ghost forcé à s'arrêter."
