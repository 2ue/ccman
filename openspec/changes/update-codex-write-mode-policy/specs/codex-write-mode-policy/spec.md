## ADDED Requirements

### Requirement: Regular tool management uses incremental updates

The system SHALL use incremental configuration updates for regular provider management flows across the standard tool-management commands.

#### Scenario: Switch provider through standard management flow

- **WHEN** the user switches a provider through a standard management flow such as `ccman cx`, `ccman cc`, `ccman gm`, `ccman oc`, or `ccman openclaw`
- **THEN** the system SHALL update the corresponding tool configuration incrementally
- **AND** it SHALL preserve unrelated existing settings where practical

#### Scenario: Edit current provider through standard management

- **WHEN** the user edits or reapplies a provider through a standard management flow
- **THEN** the system SHALL use the incremental write mode for the affected tool

### Requirement: Shortcut setup commands may overwrite tool configs

The system SHALL keep overwrite-oriented behavior for documented quick-setup shortcut flows across every tool they configure.

#### Scenario: Configure GMN shortcut flow

- **WHEN** the user runs `ccman gmn`
- **THEN** the system SHALL apply overwrite mode to each tool configuration touched by that shortcut flow

#### Scenario: Configure GMN1 shortcut flow

- **WHEN** the user runs `ccman gmn1` or `ccman gmncode`
- **THEN** the system SHALL apply overwrite mode to each tool configuration touched by that shortcut flow

#### Scenario: Configure standalone quick-setup helpers

- **WHEN** the user runs shortcut-style helpers such as `@2ue/aicoding`, `scripts/setup-gmn.mjs`, or `scripts/setup-gmn-standalone.mjs`
- **THEN** the system SHALL apply overwrite-oriented writes to each tool configuration touched by that shortcut flow

### Requirement: Write mode is selected by entrypoint

The system SHALL determine write strategy by command flow rather than a single global hardcoded policy per tool.

#### Scenario: Different entrypoints choose different write modes

- **WHEN** a standard management command and a GMN shortcut command both apply tool configuration
- **THEN** the standard management command SHALL use incremental mode
- **AND** the GMN shortcut command SHALL use overwrite mode for the tools it configures

### Requirement: Shortcut overwrite is applied without an intermediate merge write

The system SHALL keep shortcut setup flows semantically overwrite-only at the managed tool configuration layer.

#### Scenario: Reconfigure an already-active provider via a shortcut flow

- **WHEN** a shortcut flow updates provider metadata for a provider that is already active and then reapplies the tool configuration
- **THEN** the system SHALL NOT first apply an incremental write to the managed tool config
- **AND** it SHALL only apply the overwrite-oriented write for that shortcut execution

### Requirement: Write semantics are documented

The system SHALL document which standard management commands are incremental and which shortcut commands are overwrite-based across the affected tools.

#### Scenario: User reviews command behavior

- **WHEN** the user reads the relevant CLI or script documentation
- **THEN** the write behavior of regular management commands and quick-setup commands SHALL be clearly distinguished
