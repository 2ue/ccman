# provider-service Specification

## Purpose
TBD - created by archiving change refactor-plugin-architecture. Update Purpose after archive.
## Requirements
### Requirement: Provider CRUD Operations

The system SHALL provide unified provider management across all tools via ProviderService.

#### Scenario: Add provider
- **GIVEN** a tool "claude-code" exists
- **WHEN** `ProviderService.add('claude-code', { name, baseUrl, apiKey })` is called
- **THEN** a Provider SHALL be created with auto-generated id
- **AND** createdAt and updatedAt timestamps SHALL be set
- **AND** Provider SHALL be saved to `~/.ccman/claude.json`

#### Scenario: List providers
- **GIVEN** multiple providers exist for "codex"
- **WHEN** `ProviderService.list('codex')` is called
- **THEN** it SHALL return array of all Providers for that tool
- **AND** array SHALL be sorted by createdAt descending

#### Scenario: Update provider
- **GIVEN** an existing provider with name "my-provider"
- **WHEN** `ProviderService.update('codex', 'my-provider', { apiKey: 'new-key' })` is called
- **THEN** provider's apiKey SHALL be updated
- **AND** updatedAt timestamp SHALL be refreshed
- **AND** other fields SHALL remain unchanged

#### Scenario: Delete provider
- **GIVEN** a provider with name "old-provider" exists
- **WHEN** `ProviderService.delete('codex', 'old-provider')` is called
- **THEN** provider SHALL be removed from storage
- **AND** `ProviderService.list()` SHALL NOT include it

#### Scenario: Provider not found
- **GIVEN** no provider with name "nonexistent" exists
- **WHEN** `ProviderService.update('codex', 'nonexistent', {})` is called
- **THEN** it SHALL throw ProviderNotFoundError

### Requirement: Apply Provider to Tool

The system SHALL write provider configuration to tool's official config files.

#### Scenario: Apply provider to Claude Code
- **GIVEN** a provider for "claude-code" with apiKey and baseUrl
- **WHEN** `ProviderService.apply('claude-code', 'my-claude')` is called
- **THEN** `~/.claude/settings.json` SHALL be updated
- **AND** `env.ANTHROPIC_AUTH_TOKEN` SHALL be set to provider.apiKey
- **AND** `env.ANTHROPIC_BASE_URL` SHALL be set to provider.baseUrl
- **AND** other fields in settings.json SHALL be preserved

#### Scenario: Apply provider to Codex
- **GIVEN** a provider for "codex" with apiKey, baseUrl, and name
- **WHEN** `ProviderService.apply('codex', 'my-openai')` is called
- **THEN** `~/.codex/config.toml` SHALL be updated with provider config
- **AND** `~/.codex/auth.json` SHALL be updated with apiKey
- **AND** `model_provider` SHALL be set to provider.name

#### Scenario: Apply updates lastUsedAt
- **GIVEN** a provider being applied
- **WHEN** `ProviderService.apply()` completes
- **THEN** provider's lastUsedAt SHALL be updated to current timestamp
- **AND** currentProviderId SHALL be updated in tool's ccman storage

### Requirement: Provider Cloning

The system SHALL support cloning providers for multi-key management.

#### Scenario: Clone provider
- **GIVEN** a provider "claude-official" exists
- **WHEN** `ProviderService.clone('claude-code', 'claude-official', 'my-key2', { apiKey: 'new-key' })` is called
- **THEN** a new provider SHALL be created with name "my-key2"
- **AND** new provider SHALL inherit all fields from source
- **AND** new provider.apiKey SHALL be "new-key" (overridden)
- **AND** new provider.id SHALL be auto-generated (different from source)

#### Scenario: Clone without overrides
- **GIVEN** a provider to clone
- **WHEN** cloned without overrides parameter
- **THEN** new provider SHALL be identical to source except id, name, timestamps

### Requirement: Current Provider Tracking

The system SHALL track and retrieve the currently active provider per tool.

#### Scenario: Get current provider
- **GIVEN** "my-provider" was last applied to "codex"
- **WHEN** `ProviderService.current('codex')` is called
- **THEN** it SHALL return the "my-provider" Provider object

#### Scenario: No current provider
- **GIVEN** no provider has been applied to "gemini-cli"
- **WHEN** `ProviderService.current('gemini-cli')` is called
- **THEN** it SHALL return null

### Requirement: Provider Validation

The system SHALL validate provider input before saving.

#### Scenario: Required fields validation
- **GIVEN** a provider input missing required field (e.g., baseUrl for Claude)
- **WHEN** `ProviderService.add()` is called
- **THEN** ServiceAdapter.validate() SHALL be called
- **AND** it SHALL throw ValidationFailedError

#### Scenario: Tool-specific validation
- **GIVEN** Codex requires baseUrl and apiKey
- **AND** Gemini may have optional baseUrl (can use defaults)
- **WHEN** adding providers to each tool
- **THEN** each tool's ServiceAdapter SHALL apply its own validation rules

### Requirement: Tool-Agnostic API

ProviderService SHALL work uniformly across all tools without tool-specific code.

#### Scenario: Same API for all tools
- **GIVEN** any tool (codex, claude-code, gemini-cli)
- **WHEN** calling ProviderService methods
- **THEN** API SHALL be identical (same method signatures)
- **AND** tool-specific behavior SHALL be delegated to ServiceAdapter

#### Scenario: Add new tool without changing ProviderService
- **GIVEN** a new tool "codebuddy-cli" is registered
- **WHEN** `ProviderService.add('codebuddy-cli', input)` is called
- **THEN** it SHALL work without any changes to ProviderService code
- **AND** tool's ServiceAdapter SHALL handle all tool-specific logic

