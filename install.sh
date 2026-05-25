#!/usr/bin/env bash
# install.sh - install dependencies and verify local requirements for Tournaments.
#
# Usage:
#   ./install.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "error: Node.js 20 or newer is required." >&2
  echo "Install it from https://nodejs.org/ or your system package manager, then rerun this script." >&2
  exit 1
fi

if ! node -e 'const major = Number(process.versions.node.split(".")[0]); process.exit(major >= 20 ? 0 : 1)' >/dev/null 2>&1; then
  echo "error: Node.js 20 or newer is required; found $(node --version)." >&2
  exit 1
fi

cd "$ROOT_DIR"
npm install --no-fund --no-audit
chmod +x "$ROOT_DIR"/scripts/*.sh 2>/dev/null || true

echo ""
echo "Tournaments is ready."
echo ""
echo "Try the sample tournament:"
echo "  npm run start:sample"
echo ""
echo "Or start the server and create your own:"
echo "  npm start"
