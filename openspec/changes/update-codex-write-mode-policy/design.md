## Context

The repository currently has two different user intents that should be reflected consistently across all managed tools:

1. **Provider management intent**
   - examples: `ccman cx add`, `ccman cx edit`, `ccman cx use`, interactive `ccman cx`, and the equivalent standard flows for Claude / Gemini / OpenCode / OpenClaw
   - user expectation: keep existing Codex settings where possible and only update the managed provider-related fields

2. **Quick setup intent**
   - examples: `ccman gmn`, `ccman gmn1`, related standalone quick-setup/install scripts
   - user expectation: apply a known-good preset strongly and predictably, even if that means overwriting more of the configs for the tools being configured

Today, regular flows and shortcut flows do not map cleanly to a single consistent rule:

- Codex regular management is overwrite-heavy
- Claude / Gemini / OpenCode / OpenClaw regular management is already mostly incremental
- shortcut flows are mixed: some tools are overwritten, others are merged

This means the product currently varies by tool implementation details instead of a deliberate command policy.

## Goals

- Make regular management flows incremental by default across all standard tool-management commands.
- Preserve overwrite behavior for GMN-style shortcut/setup flows across every tool they configure.
- Keep behavior explicit and easy to reason about by entrypoint.
- Avoid changing provider/model defaults unless a specific flow already intends to do so.

## Non-Goals

- Reworking unrelated systems such as MCP write behavior unless explicitly needed later.
- Changing provider/model defaults for existing preset flows.
- Removing overwrite behavior from one-click setup flows.

## Proposed Design

### 1. Add explicit write modes by command intent

Writers and/or call sites should support at least two intent-driven modes:

- `merge`
  - used by regular provider management flows
  - preserves unrelated existing config where practical
  - updates provider-related fields, auth, and managed defaults only

- `overwrite`
  - used by GMN-style shortcut/setup flows
  - preserves or introduces the current behavior of applying a known-good preset strongly for every configured tool

### 2. Entry-point policy

#### Incremental (`merge`)

Use merge mode for:

- `ccman cx use`
- `ccman cx add` when it triggers an apply/switch
- `ccman cx edit` when it triggers an apply/switch
- `ccman cc`, `ccman gm`, `ccman oc`, `ccman openclaw` and their normal add/edit/use flows
- interactive Codex management flow backed by the same standard manager path
- any normal provider CRUD flow that represents routine management

#### Overwrite

Use overwrite mode for:

- `ccman gmn`
- `ccman gmn1`
- `ccman gmncode`
- standalone quick setup scripts related to GMN/Codex bootstrap
- standalone GMN setup scripts that configure Claude / Gemini / OpenCode / OpenClaw
- any future shortcut/setup command explicitly documented as reset-oriented

### 3. Call-site driven behavior

Instead of hardcoding one global behavior per writer, callers should select the write mode explicitly based on command intent.

This avoids:

- making shortcut commands unexpectedly gentle
- making regular provider management unexpectedly destructive

### 4. Documentation policy

User-facing docs should clearly separate, for all relevant tools:

- **常规管理命令**: 增量更新
- **快捷配置命令**: 覆盖写入

This is important because users often choose commands based on safety expectations.

## Testing Strategy

- add writer-level tests for merge mode and overwrite mode where writers support both
- add command-path tests where practical for selecting the correct write mode by entrypoint
- keep validation focused on filesystem-isolated tests, not real user HOME

## Risks

- Merge mode may preserve unexpected legacy fields if the scope is too broad
- Overwrite mode and merge mode can drift if defaults are not kept aligned across tools

## Mitigation

- centralize shared defaults per tool and only vary the write strategy
- test merge mode specifically against existing custom config retention
- test overwrite mode specifically against the current shortcut expectations for every affected tool
