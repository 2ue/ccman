# provider-service Spec Delta

## MODIFIED Requirements

### Requirement: Provider CRUD Operations

The system SHALL provide unified provider management across all tools via ProviderService.

#### Scenario: Add provider
- **GIVEN** a tool "claude-code" exists
- **WHEN** `ProviderService.add('claude-code', { name, baseUrl, apiKey })` is called
- **THEN** a Provider SHALL be created with auto-generated id
- **AND** createdAt and updatedAt timestamps SHALL be set
- **AND** Provider SHALL be saved to `~/.ccman/claude-code.json`

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

## ADDED Requirements

### Requirement: Storage Path Convention

The system SHALL use consistent storage paths based on tool identifier.

#### Scenario: Storage path for claude-code
- **GIVEN** the tool identifier "claude-code"
- **WHEN** ProviderService stores or retrieves data
- **THEN** storage path SHALL be `~/.ccman/claude-code.json`

#### Scenario: Storage path for gemini-cli
- **GIVEN** the tool identifier "gemini-cli"
- **WHEN** ProviderService stores or retrieves data
- **THEN** storage path SHALL be `~/.ccman/gemini-cli.json`

#### Scenario: Storage path for codex
- **GIVEN** the tool identifier "codex"
- **WHEN** ProviderService stores or retrieves data
- **THEN** storage path SHALL be `~/.ccman/codex.json`

### Requirement: Data Consistency with Legacy API

The system SHALL ensure data consistency between new ProviderService API and legacy tool-manager API.

#### Scenario: Providers visible across APIs
- **GIVEN** a provider added via `ProviderService.add('claude-code', input)`
- **WHEN** accessed via `createClaudeManager().list()`
- **THEN** the provider SHALL be included in the result
- **AND** all fields SHALL match exactly

#### Scenario: Providers added via legacy API visible in new API
- **GIVEN** a provider added via `createClaudeManager().add(input)`
- **WHEN** accessed via `ProviderService.list('claude-code')`
- **THEN** the provider SHALL be included in the result
- **AND** all fields SHALL match exactly

#### Scenario: Current provider consistent across APIs
- **GIVEN** a provider set as current via `ProviderService.apply('codex', 'my-provider')`
- **WHEN** checked via `createCodexManager().getCurrent()`
- **THEN** it SHALL return the same provider
- **AND** all fields SHALL match exactly
