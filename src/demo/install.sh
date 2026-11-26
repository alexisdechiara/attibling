#!/usr/bin/env bash
# Installs Ghost 6.78.0 (SQLite, development mode, http://localhost:2368) into $GEEKLY_DEMO_DIR/site, WITHOUT
# Docker, then adds the safety configuration and copies the theme. Safe to run again (it skips what exists).
# Usage: npm run demo:install
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/env.sh"

GHOST_VERSION="6.78.0"
GHOST_CLI_VERSION="1.34.1"
PNPM_VERSION="12.21.0" # ghost-cli 1.34.1 needs pnpm >= 11.10 for Ghost 6.78; installed locally, not globally

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "Node $NODE_MAJOR détecté : Ghost 6 demande Node 22 ou plus récent." >&2
  exit 1
fi

# ghost-cli refuses to run as root. Only for throw-away root-only containers: GEEKLY_DEMO_ALLOW_ROOT=1 fakes a
# non-root user for `ghost install` (never needed on a personal computer).
if [ "$(id -u)" = "0" ]; then
  if [ "${GEEKLY_DEMO_ALLOW_ROOT:-}" != "1" ]; then
    echo "ghost-cli refuse de s'exécuter en root. Lancez la commande avec un utilisateur normal." >&2
    echo "(Conteneur jetable uniquement : GEEKLY_DEMO_ALLOW_ROOT=1, voir README.md.)" >&2
    exit 1
  fi
  export GHOST_CLI_PRE_CHECKS=false
  export NODE_OPTIONS="--require $DEMO_HERE/no-root-check.cjs"
fi

echo "Dossier de travail : $WORK"
mkdir -p "$WORK/tools" "$WORK/site" "$WORK/theme"

if [ ! -x "$WORK/tools/node_modules/.bin/ghost" ]; then
  echo "Installation de ghost-cli $GHOST_CLI_VERSION et pnpm $PNPM_VERSION dans $WORK/tools..."
  (
    cd "$WORK/tools"
    [ -f package.json ] || npm init -y >/dev/null
    npm install --no-fund --no-audit "ghost-cli@$GHOST_CLI_VERSION" "pnpm@$PNPM_VERSION"
  )
fi
export PATH="$WORK/tools/node_modules/.bin:$PATH"

if [ -f "$WORK/site/current/package.json" ]; then
  echo "Ghost est déjà installé dans $WORK/site."
else
  echo "Installation de Ghost $GHOST_VERSION (quelques minutes)..."
  (
    cd "$WORK/site"
    ghost install "$GHOST_VERSION" --local --no-start --no-prompt --db sqlite3 --port 2368 --url http://localhost:2368
  )
fi

node "$DEMO_HERE/lib/safety.mjs" "$WORK/site/config.development.json"
node "$DEMO_HERE/lib/theme.mjs" sync
echo
echo "Installation terminée. Suite : npm run demo:start (dans un terminal), puis npm run demo:images et npm run demo:seed."
