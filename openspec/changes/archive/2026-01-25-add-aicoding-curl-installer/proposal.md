# Change: add curl installer for aicoding

## Why
Users want a one-line, copy-paste install/run flow (`curl ... | bash`) to launch the aicoding interactive setup without manually installing the package.

## What Changes
- Add a repository-hosted shell script that runs `@2ue/aicoding` in interactive mode and supports optional args.
- Document the curl-based entrypoint and where the script lives in the repo.
- Align aicoding interactive prompts with `ccman gmn` (same fields, order, and selection UI).

## Impact
- Affected specs: aicoding-installer
- Affected code: new script under `scripts/`, aicoding CLI prompts, docs updates (aicoding README and/or top-level README).
