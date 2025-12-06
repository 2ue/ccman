# Implementation Tasks

## 1. Update Root README.md
- [ ] 1.1 Update project description in header (line 3)
  - FROM: "Codex 和 Claude Code 的 API 服务商配置管理工具"
  - TO: "Codex、Claude Code、Gemini CLI 和 MCP 的配置管理工具"
- [ ] 1.2 Fix installation command (around line 59)
  - FROM: `npm install -g @ccman/cli`
  - TO: `npm install -g ccman`
- [ ] 1.3 Update "核心特性" section (around line 36)
  - Remove: "内置 7 个常用服务商模板"
  - Add: Tool-specific preset counts (Codex: 1, Claude: 7, Gemini: 3, MCP: multiple)
- [ ] 1.4 Update "Commands" section (around line 92-96)
  - Add `gm` subcommand: "管理 Gemini CLI 服务商"
  - Add `mcp` subcommand: "管理 MCP 服务器"
- [ ] 1.5 Add MCP management to features list
  - Add bullet point about MCP server management for Claude/Gemini

## 2. Update CLI README
- [ ] 2.1 Update packages/cli/README.md with same changes as root README
- [ ] 2.2 Ensure CLI commands list includes all subcommands (cx, cc, gm, mcp, sync)

## 3. Update Package Metadata
- [ ] 3.1 Update packages/cli/package.json
  - description: mention Gemini and MCP
  - keywords: add "gemini" and "mcp"
- [ ] 3.2 Update root package.json
  - description: mention all 4 tools

## 4. Update Analysis Docs (Optional)
- [ ] 4.1 Review analysis/B-技术架构与代码结构.md
  - Decision: update ToolType examples OR mark doc as "v3.1 snapshot" for historical reference
- [ ] 4.2 Add note in analysis/ directory README (if exists) about document versioning

## 5. Validation
- [ ] 5.1 Search for any remaining "@ccman/cli" references
  - Command: `rg "@ccman/cli" --type md`
- [ ] 5.2 Search for outdated tool descriptions
  - Command: `rg "Codex 和 Claude Code" --type md`
  - Command: `rg "Codex and Claude Code" --type md`
- [ ] 5.3 Verify all CLI subcommands documented match src/index.ts
- [ ] 5.4 Check preset counts match actual preset files
  - packages/core/src/presets/codex.ts
  - packages/core/src/presets/claude.ts
  - packages/core/src/presets/gemini.ts
  - packages/core/src/presets/mcp.ts

## 6. Review
- [ ] 6.1 Self-review: ensure all install commands use `ccman`
- [ ] 6.2 Self-review: ensure all tool lists include Gemini and MCP
- [ ] 6.3 Test: try following README install instructions on clean machine (if possible)
