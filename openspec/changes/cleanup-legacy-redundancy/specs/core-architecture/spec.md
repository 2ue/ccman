# core-architecture Spec Delta

## MODIFIED Requirements

### Requirement: Backward Compatibility

The system SHALL maintain 100% backward compatibility via a compatibility layer.

#### Scenario: Old factory functions continue working
- **GIVEN** existing code using `createCodexManager()`
- **WHEN** the function is called
- **THEN** it SHALL return a working ToolManager instance
- **AND** emit a deprecation warning (once per tool type)
- **AND** proxy all operations to new ProviderService
- **AND** map old tool identifiers to new ones (`claude` → `claude-code`, `gemini` → `gemini-cli`)

#### Scenario: Data format unchanged
- **GIVEN** existing `~/.ccman/*.json` configuration files
- **WHEN** the new architecture is deployed
- **THEN** all files SHALL remain readable
- **AND** file format SHALL NOT change
- **AND** all existing fields SHALL be preserved

#### Scenario: User workflows unaffected
- **GIVEN** a user with existing CLI scripts
- **WHEN** upgrading to v3.3
- **THEN** all scripts SHALL continue functioning
- **AND** no user intervention SHALL be required

#### Scenario: Automatic data migration
- **GIVEN** existing config files with old naming (`claude.json`, `gemini.json`)
- **WHEN** the application starts after upgrade
- **THEN** files SHALL be automatically renamed to new convention (`claude-code.json`, `gemini-cli.json`)
- **AND** original files SHALL be backed up with timestamp suffix
- **AND** migration SHALL only execute once (tracked in config.json)

## ADDED Requirements

### Requirement: Tool Identifier Mapping

The system SHALL provide transparent mapping between legacy and current tool identifiers.

#### Scenario: Legacy identifier used in factory function
- **GIVEN** code calling `createToolManager('claude')`
- **WHEN** the function executes
- **THEN** it SHALL internally use `'claude-code'` for all ProviderService calls
- **AND** storage path SHALL be `~/.ccman/claude-code.json`

#### Scenario: Mapping table completeness
- **GIVEN** the tool identifier mapping
- **WHEN** any ToolType value is looked up
- **THEN** a valid Tool value SHALL be returned
- **AND** mapping SHALL include: `codex` → `codex`, `claude` → `claude-code`, `gemini` → `gemini-cli`, `mcp` → `mcp`

#### Scenario: Consistent data access
- **GIVEN** providers added via new CLI (`ccman claude add`)
- **WHEN** accessed via legacy API (`createClaudeManager().list()`)
- **THEN** all providers SHALL be visible
- **AND** data SHALL be identical to `ProviderService.list('claude-code')`

## REMOVED Requirements

### Requirement: Independent compat Layer

**Reason**: The `compat/tool-manager.ts` module was created but never integrated. It duplicates functionality already present in the main `tool-manager.ts`.

**Migration**: The compatibility functionality is now directly implemented in `tool-manager.ts` which delegates to `ProviderService`. No external migration needed as the compat module was never used.
