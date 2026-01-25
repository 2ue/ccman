#!/usr/bin/env bash
set -euo pipefail

NPM_PACKAGE="@2ue/aicoding"

# Reattach to tty so interactive prompts work under curl | bash
if [ ! -t 0 ] && [ -r /dev/tty ]; then
  exec </dev/tty
fi
if [ ! -t 1 ] && [ -w /dev/tty ]; then
  exec >/dev/tty
fi
if [ ! -t 2 ] && [ -w /dev/tty ]; then
  exec 2>/dev/tty
fi

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js >= 18 is required." >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "❌ npx is required (install npm first)." >&2
  exit 1
fi

exec npx --yes "$NPM_PACKAGE" "$@"
