# Change: update tool write mode policy

## Why

Current behavior is inconsistent with the intended user mental model across the managed tools:

- regular provider management commands such as `ccman cx` / `ccman cc` / `ccman gm` / `ccman oc` / `ccman openclaw` are expected to behave like incremental configuration management
- shortcut-style commands such as `ccman gmn` / `ccman gmn1` and related quick-setup scripts are closer to "one-click setup/reset" and should be allowed to overwrite the configs of the tools they touch
- today, Codex is overwrite-heavy even for regular management, while other tools are mostly incremental, and shortcut flows are mixed rather than uniformly overwrite-oriented

This blurs the distinction between "provider management" and "quick setup" commands, and makes write safety expectations inconsistent across tools.

## What Changes

- Introduce a clear write policy distinction across managed tools:
  - regular provider management commands use incremental update / merge behavior
  - GMN-style shortcut commands and related quick-setup scripts use explicit overwrite behavior for every tool they configure
- Update writer internals and/or call sites so write mode is chosen by the calling flow instead of being globally implied.
- Ensure shortcut flows are "pure overwrite" at the tool-config layer: they must not first apply an incremental write and then overwrite the same target in the same shortcut execution.
- Align all shortcut-style entrypoints with the same mental model, including `ccman gmn`, `ccman gmn1`, `ccman gmncode`, `@2ue/aicoding`, and the historical `scripts/setup-gmn*.mjs` helpers.
- Keep the effective provider/model defaults unchanged while changing only the write strategy by entrypoint.
- Document which commands are incremental and which commands are overwrite-based across Codex, Claude, Gemini, OpenCode, and OpenClaw.

## Impact

- Affected specs: `tool-write-mode-policy`
- Affected code: Codex/Claude/Gemini/OpenCode/OpenClaw writers, tool manager or call sites, standard provider management commands, GMN shortcut commands, standalone setup/install scripts, docs
