# Change: Fix Documentation to Match Actual Capabilities

## Why

**Problem**: As of v3.2.0, ccman supports 4 tools (Codex, Claude Code, Gemini CLI, MCP), but documentation still describes it as "Codex and Claude Code only". This causes:

1. **User Confusion**: New users don't know Gemini and MCP are supported
2. **Installation Errors**: README says `npm install -g @ccman/cli`, but actual package name is `ccman`
3. **Contributor Misunderstanding**: Analysis docs show outdated `ToolType` definitions
4. **Misleading Information**: README claims "7 built-in presets", but actual counts vary by tool (Codex: 1, Claude: 7, Gemini: 3, MCP: multiple)

**Impact**: Low discoverability of new features, installation failures, wasted contributor time reading outdated docs.

**Source**: Identified in `analysis/H-三工具与MCP问题清单.md` section 1.

## What Changes

### Documentation Updates (Non-Breaking)
- **README.md** (root)
  - Update description to mention all 4 tools: "Codex, Claude Code, Gemini CLI, and MCP"
  - Fix install command: `npm install -g @ccman/cli` → `npm install -g ccman`
  - Update CLI commands section to include `gm` and `mcp` subcommands
  - Fix preset count description: replace "7 presets" with tool-specific counts
  - Add MCP management feature description

- **packages/cli/README.md**
  - Same updates as root README
  - Ensure CLI subcommands list includes `gm` and `mcp`

- **packages/cli/package.json**
  - Update `description` field to mention Gemini and MCP
  - Update `keywords` to include "gemini" and "mcp"

- **Root package.json**
  - Update `description` to match actual capabilities

- **analysis/** docs (if needed)
  - Update `ToolType` examples to current definition: `'codex' | 'claude' | 'mcp' | 'gemini'`
  - Mark as "analysis snapshot" if keeping old state for historical reference

### No Code Changes
- This is a **documentation-only** change
- No specs/ changes needed (no functional behavior modified)

## Impact

### Affected Files
- `README.md` (root)
- `packages/cli/README.md`
- `packages/cli/package.json`
- `package.json` (root)
- `analysis/B-技术架构与代码结构.md` (optional: mark as historical or update)

### User Impact
- ✅ New users can discover Gemini and MCP features
- ✅ Installation instructions work correctly
- ✅ CLI help text already correct (no changes needed in code)

### Contributor Impact
- ✅ Documentation matches actual codebase state
- ✅ Reduced confusion when reading analysis docs

### Breaking Changes
- **None** - Documentation updates only
