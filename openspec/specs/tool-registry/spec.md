# tool-registry Specification

## Purpose
TBD - created by archiving change refactor-plugin-architecture. Update Purpose after archive.
## Requirements
### Requirement: Tool Registration

The system SHALL provide a ToolRegistry for registering and discovering tools.

#### Scenario: Register a tool
- **GIVEN** a ToolDescriptor for "codebuddy-cli"
- **WHEN** `registry.register(descriptor)` is called
- **THEN** the tool SHALL be stored in registry
- **AND** subsequent `registry.get('codebuddy-cli')` SHALL return the descriptor

#### Scenario: Prevent duplicate registration
- **GIVEN** a tool with id "codex" already registered
- **WHEN** attempting to register another tool with id "codex"
- **THEN** the system SHALL throw an error
- **AND** the original descriptor SHALL remain unchanged

#### Scenario: List all registered tools
- **GIVEN** multiple tools registered (codex, claude-code, gemini-cli)
- **WHEN** `registry.list()` is called
- **THEN** it SHALL return an array of all ToolDescriptors
- **AND** array SHALL include all registered tools

### Requirement: Tool Discovery

The system SHALL allow querying tools by various criteria.

#### Scenario: Get tool by ID
- **GIVEN** a tool registered with id "claude-code"
- **WHEN** `registry.get('claude-code')` is called
- **THEN** it SHALL return the matching ToolDescriptor

#### Scenario: Get tool by short name
- **GIVEN** a tool registered with short name "cc"
- **WHEN** `registry.getByShort('cc')` is called
- **THEN** it SHALL return the matching ToolDescriptor for "claude-code"

#### Scenario: Filter tools by capability
- **GIVEN** multiple tools with different capabilities
- **WHEN** `registry.filterByCapability('mcp')` is called
- **THEN** it SHALL return only tools with 'mcp' in their capabilities array
- **AND** result SHALL include claude-code and gemini-cli
- **AND** result SHALL NOT include codex (no MCP support)

#### Scenario: Tool not found
- **GIVEN** no tool registered with id "nonexistent"
- **WHEN** `registry.get('nonexistent')` is called
- **THEN** it SHALL throw a ToolNotFoundError

### Requirement: Tool Descriptor Contract

Each ToolDescriptor MUST declare tool capabilities, config paths, and adapters.

#### Scenario: Required fields validation
- **GIVEN** a ToolDescriptor object
- **WHEN** registering the tool
- **THEN** it MUST have `id`, `short`, `displayName` fields
- **AND** it MUST have `configPaths` array
- **AND** it MUST have `capabilities` array
- **AND** it MUST have `adapters` object

#### Scenario: Capabilities declaration
- **GIVEN** a tool supporting service provider management
- **WHEN** the ToolDescriptor is defined
- **THEN** it SHALL include 'service' in capabilities
- **AND** it SHALL provide a ServiceAdapter in adapters

#### Scenario: Config paths declaration
- **GIVEN** a tool with config file at ~/.codebuddy/config.json
- **WHEN** the ToolDescriptor is defined
- **THEN** configPaths SHALL include entry with path '~/.codebuddy/config.json'
- **AND** entry SHALL specify format as 'json'

### Requirement: Dynamic CLI/UI Generation

The system SHALL use ToolRegistry to dynamically generate CLI commands and Desktop UI.

#### Scenario: CLI command generation
- **GIVEN** a tool registered with id "codebuddy-cli" and short "cb"
- **WHEN** CLI initializes
- **THEN** command `ccman cb` SHALL be automatically available
- **AND** if tool has 'service' capability, subcommands (add, list, use) SHALL be generated

#### Scenario: Desktop sidebar generation
- **GIVEN** multiple tools registered
- **WHEN** Desktop application starts
- **THEN** sidebar SHALL display all tools dynamically
- **AND** each tool entry SHALL show its displayName
- **AND** clicking a tool SHALL navigate to its management page

#### Scenario: New tool requires no CLI changes
- **GIVEN** a new tool registered via `registry.register()`
- **WHEN** CLI is started
- **THEN** all commands for the new tool SHALL be available
- **AND** no changes SHALL be required in CLI command files

### Requirement: Tool Isolation

Each tool's implementation SHALL be isolated in its own directory under `tools/<tool-id>/`.

#### Scenario: Tool directory structure
- **GIVEN** a tool with id "codebuddy-cli"
- **WHEN** the tool is implemented
- **THEN** all files SHALL be under `tools/codebuddy-cli/`
- **AND** directory SHALL contain descriptor.ts, adapters, and presets
- **AND** no tool-specific code SHALL exist outside this directory

#### Scenario: Tool removal
- **GIVEN** a tool that needs to be removed
- **WHEN** its directory is deleted
- **THEN** no broken references SHALL remain in other parts of codebase
- **AND** ToolRegistry SHALL simply not include the tool

