# mcp-service Specification

## Purpose
TBD - created by archiving change refactor-plugin-architecture. Update Purpose after archive.
## Requirements
### Requirement: MCP Server Management

The system SHALL provide unified MCP server management via McpService.

#### Scenario: Add MCP server
- **GIVEN** MCP server details (name, command, args, env)
- **WHEN** `McpService.add({ name, command, args, enabledApps: ['claude-code'] })` is called
- **THEN** MCPServer SHALL be created with auto-generated id
- **AND** MCPServer SHALL be saved to `~/.ccman/mcp.json`

#### Scenario: List MCP servers
- **WHEN** `McpService.list()` is called
- **THEN** it SHALL return array of all MCPServer instances

#### Scenario: Update MCP server
- **GIVEN** an existing MCP server "filesystem"
- **WHEN** `McpService.update('filesystem', { args: ['new-path'] })` is called
- **THEN** server's args SHALL be updated
- **AND** updatedAt timestamp SHALL be refreshed

#### Scenario: Delete MCP server
- **GIVEN** an MCP server "old-server" exists
- **WHEN** `McpService.delete('old-server')` is called
- **THEN** server SHALL be removed from storage
- **AND** SHALL be removed from all tools' official configs

### Requirement: Multi-Tool MCP Application

The system SHALL apply MCP servers to multiple tools simultaneously.

#### Scenario: Apply MCP to multiple tools
- **GIVEN** an MCP server "filesystem"
- **WHEN** `McpService.apply('filesystem', ['claude-code', 'gemini-cli'])` is called
- **THEN** `~/.claude/settings.json` mcpServers SHALL include "filesystem"
- **AND** `~/.gemini/settings.json` mcpServers SHALL include "filesystem"
- **AND** enabledApps SHALL be updated to ['claude-code', 'gemini-cli']

#### Scenario: Tool without MCP support
- **GIVEN** an MCP server
- **WHEN** attempting to apply to "codex" (no MCP support)
- **THEN** it SHALL skip "codex" or throw error
- **AND** McpAdapter SHALL not be called for "codex"

#### Scenario: Remove MCP from tool
- **GIVEN** an MCP server enabled for claude and gemini
- **WHEN** `McpService.apply('filesystem', ['claude-code'])` is called (only claude)
- **THEN** `~/.claude/settings.json` SHALL still have "filesystem"
- **AND** `~/.gemini/settings.json` SHALL NOT have "filesystem"

### Requirement: MCP Configuration Sync

The system SHALL keep ccman storage and tools' official configs in sync.

#### Scenario: Bidirectional sync
- **GIVEN** an MCP server updated via McpService
- **WHEN** `McpService.apply()` is called
- **THEN** changes SHALL be written to `~/.ccman/mcp.json`
- **AND** changes SHALL be written to each enabled tool's config
- **AND** both SHALL remain consistent

#### Scenario: Zero-destructive writes
- **GIVEN** a tool's config has user-defined MCP servers not managed by ccman
- **WHEN** McpService writes to tool config
- **THEN** user-defined servers SHALL be preserved
- **AND** only ccman-managed servers SHALL be updated

