# Documentation Capability

## MODIFIED Requirements

### Requirement: Package Installation Instructions
The project documentation SHALL provide accurate installation commands that match the actual published package name.

**Rationale**: Previous documentation used `@ccman/cli` which causes installation failures. Actual package name is `ccman`.

#### Scenario: User follows installation instructions
- **WHEN** user reads README.md installation section
- **AND** runs the documented npm install command
- **THEN** the package installs successfully
- **AND** the `ccman` CLI is available in PATH

#### Scenario: Package metadata matches documentation
- **WHEN** contributor checks package.json
- **THEN** the `name` field matches install command in docs
- **AND** package name is `ccman` (not `@ccman/cli`)

---

### Requirement: Supported Tools Description
The project documentation SHALL accurately list all supported AI coding tools and their management capabilities.

**Rationale**: Documentation only mentioned "Codex and Claude Code" but actual implementation supports 4 tools: Codex, Claude Code, Gemini CLI, and MCP.

#### Scenario: User discovers available tools
- **WHEN** user reads project description in README
- **THEN** all 4 supported tools are clearly mentioned: Codex, Claude Code, Gemini CLI, MCP
- **AND** tool-specific CLI subcommands are documented (cx, cc, gm, mcp)

#### Scenario: User checks CLI help output
- **WHEN** user runs `ccman --help`
- **THEN** output matches documented subcommands
- **AND** includes cx, cc, gm, mcp, sync, export, import

---

### Requirement: Preset Templates Accuracy
The project documentation SHALL accurately describe the number and nature of built-in preset templates for each tool.

**Rationale**: Documentation claimed "7 built-in presets" universally, but actual counts vary: Codex (1), Claude (7), Gemini (3), MCP (multiple).

#### Scenario: User expects correct preset count
- **WHEN** user reads about built-in presets in documentation
- **THEN** preset counts are tool-specific
- **AND** Codex shows 1 preset
- **AND** Claude Code shows 7 presets
- **AND** Gemini CLI shows 3 presets
- **AND** MCP shows multiple presets

#### Scenario: Developer verifies preset files
- **WHEN** developer checks preset source files
- **THEN** actual preset counts match documentation
- **AND** files are: presets/codex.ts (1), presets/claude.ts (7), presets/gemini.ts (3), presets/mcp.ts (multiple)

---

### Requirement: CLI Subcommands Documentation
The project documentation SHALL document all available CLI subcommands with their purposes.

**Rationale**: Missing documentation for `gm` (Gemini) and `mcp` subcommands despite being implemented.

#### Scenario: User discovers Gemini CLI management
- **WHEN** user reads CLI commands section
- **THEN** `gm` subcommand is documented
- **AND** purpose is described as "管理 Gemini CLI 服务商"
- **AND** available sub-subcommands are listed (add, list, use, current, edit, remove, clone)

#### Scenario: User discovers MCP management
- **WHEN** user reads CLI commands section
- **THEN** `mcp` subcommand is documented
- **AND** purpose is described as "管理 MCP 服务器"
- **AND** available sub-subcommands are listed (add, list, edit, remove)

---

### Requirement: Package Metadata Consistency
Package metadata fields (description, keywords) SHALL accurately reflect current capabilities.

**Rationale**: package.json files still describe "Codex and Claude Code" without mentioning Gemini and MCP.

#### Scenario: npm search finds ccman for Gemini
- **WHEN** user searches npm for "gemini cli config"
- **THEN** ccman appears in results
- **AND** package keywords include "gemini"

#### Scenario: npm search finds ccman for MCP
- **WHEN** user searches npm for "mcp server"
- **THEN** ccman appears in results
- **AND** package keywords include "mcp"

#### Scenario: Package description is accurate
- **WHEN** user views package on npmjs.com
- **THEN** description mentions all supported tools
- **AND** includes "Codex", "Claude Code", "Gemini CLI", "MCP"
