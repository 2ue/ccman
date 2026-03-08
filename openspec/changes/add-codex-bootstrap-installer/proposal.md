# Change: add Codex bootstrap installer

## Why

Users who want to use Codex with ccman-managed providers still have to solve several setup steps manually: prepare a compatible Node.js runtime, choose how to install or upgrade it on their platform, install the Codex CLI itself, and only then apply provider configuration. This is especially error-prone when users already have Node installed but on an incompatible version, or when they have an existing version manager that should be reused instead of replaced.

## What Changes

- Add a one-click Codex bootstrap flow that can be downloaded and executed directly as a standalone script, without requiring a preinstalled `ccman` package or a prebuilt local repository.
- Add safe runtime resolution rules so the installer reuses a compatible existing Node.js when possible, upgrades through an already-installed version manager when available, and only proposes bootstrapping a manager or system package path when necessary.
- Add Codex CLI installation and verification steps that install or upgrade Codex after the runtime is ready.
- Add self-contained Codex configuration writing inside the standalone script while preserving the same effective provider and model defaults as ccman's Codex setup flow.
- Add a dry-run / planning mode and keep repository validation limited to simulation-only checks so automated verification never mutates the developer's real environment.
- Add user-facing documentation describing runtime decision rules, supported platforms, and what happens when the environment is partially configured.

## Impact

- Affected specs: `codex-bootstrap-installer`
- Affected code: standalone bootstrap scripts under `scripts/`, optional shared installer logic for simulation/testing, docs for installation and troubleshooting
