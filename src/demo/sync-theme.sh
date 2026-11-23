#!/usr/bin/env bash
# Refreshes the copy of the theme that Ghost serves ($GEEKLY_DEMO_DIR/theme) from this repository, or from
# another checkout / git worktree given as an argument: tracked and new files, minus what `npm run zip`
# excludes, plus the BUILT assets/ and partials/tags/prepaint.hbs (run `npm run build` first if you changed src/).
# Usage: npm run demo:sync [-- /path/to/checkout]
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/env.sh"
exec node "$DEMO_HERE/lib/theme.mjs" sync "$@"
