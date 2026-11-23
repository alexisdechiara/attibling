#!/usr/bin/env bash
# Starts Ghost in the FOREGROUND on http://localhost:2368 (admin: /ghost/). Stop it with Ctrl-C or npm run demo:stop.
# Usage: npm run demo:start
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/env.sh"

[ -f "$WORK/site/current/index.js" ] || { echo "Ghost n'est pas installé dans $WORK/site : lancez npm run demo:install." >&2; exit 1; }
# Refuses to start if the theme link leads anywhere but the copy made by sync-theme.sh (never the repository).
node "$DEMO_HERE/lib/theme.mjs" link >/dev/null

if [ -f "$WORK/ghost.pid" ] && kill -0 "$(cat "$WORK/ghost.pid")" 2>/dev/null; then
  echo "Ghost tourne déjà (PID $(cat "$WORK/ghost.pid"))." >&2
  exit 1
fi

cd "$WORK/site"
export NODE_ENV=development
export url="http://localhost:2368"
# Safety net on top of the config (privacy.useTinfoil): Ghost never phones home.
export privacy__useTinfoil=true

# SAFETY (do not remove): gscan, which Ghost runs when it activates a theme, treats any theme path under
# os.tmpdir() as a throw-away unzip and fs.rm()s .git, node_modules, CLAUDE.md, AGENTS.md, .claude... from it,
# EVEN THROUGH A SYMLINK. os.tmpdir() follows TMPDIR, so point it at a folder that is not a prefix of the theme
# path ($WORK/theme). The theme is a disposable copy anyway; never remove this line or serve the repository.
export TMPDIR="$WORK/run-tmp"
mkdir -p "$TMPDIR"
case "$WORK/theme/" in
  "$TMPDIR"*)
    echo "TMPDIR ($TMPDIR) est un préfixe du dossier du thème : refus." >&2
    exit 1
    ;;
esac

echo $$ >"$WORK/ghost.pid" # stays valid after exec: same process; stop.sh removes it
echo "Ghost démarre sur http://localhost:2368 (Ctrl-C pour arrêter)."
exec node current/index.js
