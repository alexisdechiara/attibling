# Sourced by the other scripts (bash 3.2 / macOS compatible): finds the repository and the work directory.
# Sets DEMO_HERE (this folder), REPO (the repository) and WORK ($GEEKLY_DEMO_DIR, default ~/ghost-geekly).
# The work directory is refused when it is inside the repository or under the system temp directory
# (see lib/workdir.mjs and the « Danger » section of README.md).
DEMO_HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO="$(cd "$DEMO_HERE/../.." && pwd -P)"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js est introuvable (Node 22 ou plus récent est requis)." >&2
  exit 1
fi
WORK="$(node "$DEMO_HERE/lib/workdir.mjs")" || exit 1
