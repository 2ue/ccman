# Config Service Specification

## ADDED Requirements

### Requirement: Configuration File Management

The system SHALL provide unified configuration file operations via ConfigService.

#### Scenario: List config paths
- **GIVEN** a tool "codex" with multiple config files
- **WHEN** `ConfigService.listPaths('codex')` is called
- **THEN** it SHALL return object mapping pathId to filesystem path
- **AND** SHALL include { main: '~/.codex/config.toml', auth: '~/.codex/auth.json' }

#### Scenario: Read all configs
- **GIVEN** a tool with multiple config files
- **WHEN** `ConfigService.get('codex')` is called (no pathId)
- **THEN** it SHALL return object with all configs
- **AND** keys SHALL be pathIds, values SHALL be parsed config content

#### Scenario: Read specific config
- **GIVEN** a tool "codex"
- **WHEN** `ConfigService.get('codex', 'main')` is called
- **THEN** it SHALL return only the main config file content
- **AND** content SHALL be parsed (TOML → object)

### Requirement: Configuration Updates with Merge Modes

The system SHALL support deep merging of config updates with selectable merge modes.

#### Scenario: Update with old-override-new mode
- **GIVEN** existing config with { a: 1, b: 2 }
- **AND** update data { b: 3, c: 4 }
- **WHEN** `ConfigService.update('tool', 'main', update, { mode: 'old-override-new' })` is called
- **THEN** result SHALL be { a: 1, b: 2, c: 4 }
- **AND** old values SHALL take priority (b remains 2)

#### Scenario: Update with new-override-old mode
- **GIVEN** existing config with { a: 1, b: 2 }
- **AND** update data { b: 3, c: 4 }
- **WHEN** `ConfigService.update('tool', 'main', update, { mode: 'new-override-old' })` is called
- **THEN** result SHALL be { a: 1, b: 3, c: 4 }
- **AND** new values SHALL take priority (b becomes 3)

#### Scenario: Default merge mode
- **WHEN** no mode is specified
- **THEN** default SHALL be 'old-override-new' (preserves user customizations)

### Requirement: Tool-Agnostic Operations

ConfigService SHALL delegate format-specific operations to tool's ConfigAdapter.

#### Scenario: Format abstraction
- **GIVEN** tools with different config formats (JSON, TOML, .env)
- **WHEN** ConfigService reads or writes config
- **THEN** it SHALL call tool's ConfigAdapter
- **AND** ConfigService SHALL NOT contain format-specific code

#### Scenario: Tool not found
- **GIVEN** a non-existent tool id
- **WHEN** `ConfigService.get('nonexistent')` is called
- **THEN** it SHALL throw ToolNotFoundError

#### Scenario: Invalid pathId
- **GIVEN** a tool "codex" without pathId "invalid"
- **WHEN** `ConfigService.get('codex', 'invalid')` is called
- **THEN** it SHALL throw ConfigPathNotFoundError
