# Change: Add GMN one-click setup script

## Why
Users need a fast, repeatable way to configure GMN across Claude Code, Codex, Gemini CLI, and OpenCode without navigating multiple CLI menus.

## What Changes
- Add a single script that accepts an API key and optional platform selection, then configures GMN for selected tools via core writers.
- Document usage and defaults for the script.

## Impact
- Affected specs: gmn-setup
- Affected code: scripts/setup-gmn.mjs, docs/GMN一键配置脚本.md
