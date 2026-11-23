#!/usr/bin/env bash
# Generates the demo images into $GEEKLY_DEMO_DIR/images (Python 3 + numpy + Pillow). Extra arguments go to
# gen-images.py (--force, --images <dir>). Uses $GEEKLY_DEMO_DIR/venv if it exists, or $GEEKLY_DEMO_PYTHON.
# Usage: npm run demo:images
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/env.sh"
PY="${GEEKLY_DEMO_PYTHON:-}"
if [ -z "$PY" ]; then
  if [ -x "$WORK/venv/bin/python3" ]; then PY="$WORK/venv/bin/python3"; else PY="python3"; fi
fi
exec "$PY" "$DEMO_HERE/gen-images.py" "$@"
