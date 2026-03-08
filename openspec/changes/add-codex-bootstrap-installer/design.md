## Context

ccman already knows how to write Codex configuration safely, but a user who only downloads a single installer script cannot rely on `ccman` itself being available. Installing Codex is operationally different from switching providers because it touches system dependencies and varies by platform:

- Codex depends on a working Node.js + npm environment.
- Users may already have Node.js installed, but the version may be incompatible with the current Codex package.
- Users may already manage Node.js with `volta`, `fnm`, `nvm`, `asdf`, or `mise`; the installer should reuse that instead of introducing a second manager.
- macOS, Linux, and Windows have different system package paths (`brew`, `apt`, `dnf`, `yum`, `pacman`, `zypper`, `apk`, `winget`, `choco`, `scoop`), and some users have none of them.
- Global npm installs can fail because of permissions when using a system Node.js.

The installer therefore needs a staged bootstrap design rather than a single shell command.

## Goals

- Provide a one-click Codex bootstrap flow that can move a machine from "no Codex" to "Codex installed and configured" with minimal manual branching.
- Reuse a compatible existing Node.js installation when available.
- Prefer an already-installed Node.js version manager over introducing a new one.
- Avoid forcing a version manager when the user's current runtime already satisfies Codex requirements.
- When runtime remediation is needed, prefer per-user and reversible solutions over invasive system-wide upgrades.
- Preserve the same effective Codex configuration defaults used by ccman while keeping the installer self-contained.
- Ensure repository-side validation stays simulation-only and never performs real runtime installation during automated checks.

## Non-Goals

- Managing every possible shell initialization edge case for every version manager.
- Supporting Codex IDE extension installation in the first version.
- Replacing the user's primary package manager or shell profile wholesale.
- Silently making irreversible system-level changes without confirmation.

## Proposed Flow

### 1. Bootstrap entrypoint

Use thin platform-native launchers:

- `scripts/install-codex.sh` for macOS/Linux
- `scripts/install-codex.ps1` for Windows

These launchers only do the minimum needed to enter the shared decision flow:

1. Detect OS + architecture.
2. Detect whether `node` is already available.
3. If `node` is missing, obtain a working runtime through the runtime strategy below.
4. Hand off to self-contained standalone logic for the rest of the flow.

This split is necessary because bootstrap logic cannot assume a compatible Node runtime exists before remediation.

### 2. Runtime requirement resolution

The installer should determine the required Node.js semver range dynamically from the current Codex package metadata when possible, then fall back to an installer-maintained floor if lookup fails.

Preferred resolution sequence:

1. If `npm` is available, query the current package metadata for `@openai/codex`.
2. If metadata lookup fails, use a conservative fallback floor stored in the installer.
3. After any runtime install or upgrade, re-check the resolved requirement before proceeding.

This avoids freezing a stale minimum Node version in the script.

### 3. Runtime decision order

The runtime decision tree should be:

1. **Existing compatible Node.js present**
   - Reuse it.
   - Do not install a version manager.

2. **Existing Node.js present but incompatible**
   - If an existing version manager is detected, use that manager to install or switch to a compatible Node.js.
   - If no manager is detected, recommend bootstrapping a per-user manager and explain why the current system Node is insufficient.

3. **Node.js missing**
   - If a version manager is already installed, use it.
   - Otherwise offer the safest platform-appropriate bootstrap path, with a recommended default.

### 4. Version manager preference

Detection order should prioritize already-installed tools, not a fixed global preference:

- `volta`
- `fnm`
- `nvm`
- `asdf`
- `mise`

If none are installed and runtime remediation is needed, recommend:

- **Default recommendation:** `volta`
  - per-user
  - cross-platform
  - low shell coupling
  - good fit for global CLI tooling like Codex
- **Alternative paths:** system package manager install for users who explicitly prefer it

The installer should not bootstrap a manager when the current Node.js is already compatible.

### 5. System package fallback

When users decline a version manager or when a version manager path is unavailable, offer system package paths:

- macOS: `brew install node` if Homebrew exists; optionally bootstrap Homebrew first with explicit confirmation
- Linux: distro package manager path if available, but always re-check compatibility because distro Node.js can lag behind current Codex requirements
- Windows: `winget` first, then `choco` or `scoop` if available

System package installation must be opt-in because it is more invasive than a per-user manager.

### 6. Codex installation

Once a compatible Node.js runtime is active:

1. Detect existing `codex`.
2. If present, record current version and decide whether to keep or upgrade.
3. Install or upgrade Codex through npm.
4. Verify with `codex --version`.

If global npm install fails because of permissions and the runtime is a system Node.js without a manager, the installer should stop and recommend the version-manager path rather than attempting unsafe privilege escalation by default.

### 7. Final Codex configuration

After Codex installation succeeds, the standalone installer should write `~/.codex/config.toml` and `~/.codex/auth.json` by itself.

Constraints:

- the script must not require `ccman` to be globally installed
- the script must not require a local repo checkout or prebuilt `packages/core/dist`
- the written configuration should preserve the same intended defaults as ccman's Codex setup flow wherever practical
- the script should back up existing Codex config/auth files before overwriting them

This keeps the user experience "download and run" while preserving behavioral consistency with ccman.

## UX Principles

- Show what was detected before making changes.
- Prefer "reuse what the user already has" over introducing new tools.
- Make invasive actions explicit and confirmable.
- Support a non-interactive mode later, but design the first version for an interactive and explainable flow.
- Provide a dry-run mode for debugging decisions without changing the machine.
- Keep automated verification inside the repo limited to dry-run plans, parser checks, and pure decision-logic tests.

## Testing Strategy

Because real runtime installation is machine-specific, testing should separate pure decision logic from side effects:

- unit-test detector parsing and decision tree selection
- unit-test manager and package-manager preference rules
- unit-test dry-run planning output for representative environments
- repository automation MUST NOT run real installation against the host machine
- keep real installation validation as a manual, opt-in activity outside automated repo checks

## Open Questions

- Whether the first version should support only GMN-based Codex configuration or also an official OpenAI login handoff.
- Whether a future version should additionally expose the same flow as a `ccman` top-level command.
