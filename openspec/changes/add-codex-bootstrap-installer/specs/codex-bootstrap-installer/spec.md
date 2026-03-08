## ADDED Requirements

### Requirement: Standalone cross-platform Codex bootstrap

The system SHALL provide a Codex bootstrap flow that can be downloaded and executed directly to guide a user from an unprepared machine to a working Codex CLI installation and Codex configuration on supported platforms.

#### Scenario: Existing compatible runtime

- **WHEN** the user runs the bootstrap flow on a machine that already has a compatible Node.js runtime
- **THEN** the installer SHALL reuse the existing runtime
- **AND** it SHALL proceed to install or verify the Codex CLI
- **AND** it SHALL continue to the Codex configuration step

#### Scenario: Missing runtime

- **WHEN** the user runs the bootstrap flow on a machine without Node.js
- **THEN** the installer SHALL detect the platform and available installation tools
- **AND** it SHALL offer a supported runtime installation path before attempting Codex installation
- **AND** it SHALL NOT require a preinstalled `ccman` package to continue

### Requirement: Runtime remediation policy

The installer SHALL prefer the least invasive compatible runtime path.

#### Scenario: Existing version manager present

- **WHEN** Node.js is missing or incompatible and a supported version manager is already installed
- **THEN** the installer SHALL use the existing manager instead of introducing a different manager

#### Scenario: Compatible runtime already present

- **WHEN** the current Node.js installation satisfies the resolved Codex runtime requirement
- **THEN** the installer SHALL NOT install or bootstrap a version manager

#### Scenario: Incompatible system runtime with no manager

- **WHEN** the current Node.js installation is incompatible and no supported version manager is detected
- **THEN** the installer SHALL recommend a safe remediation path
- **AND** it SHALL require confirmation before taking invasive system-level actions

### Requirement: Codex installation verification

The installer SHALL verify that Codex is installed successfully after runtime preparation.

#### Scenario: Fresh Codex install

- **WHEN** the runtime is compatible and Codex is not installed
- **THEN** the installer SHALL install Codex
- **AND** it SHALL verify the installation before continuing

#### Scenario: Existing Codex install

- **WHEN** Codex is already installed
- **THEN** the installer SHALL detect the existing installation
- **AND** it SHALL decide whether to keep or upgrade it according to the bootstrap flow

### Requirement: Preserve ccman-equivalent Codex defaults

The bootstrap flow SHALL preserve the same intended Codex provider/model defaults as ccman's Codex setup flow for the final setup step, while remaining self-contained.

#### Scenario: Apply provider configuration

- **WHEN** Codex installation succeeds and the user proceeds to configuration
- **THEN** the installer SHALL write Codex configuration without requiring a local `ccman` installation
- **AND** it SHALL preserve the current provider/model defaults expected from ccman's Codex setup flow
- **AND** it SHALL back up existing Codex config files before overwriting them

### Requirement: Explainable decisions

The bootstrap flow SHALL explain what it detected and what action it will take before changing the machine.

#### Scenario: Dry-run or interactive review

- **WHEN** the installer evaluates the environment
- **THEN** it SHALL surface the detected platform, runtime state, manager state, and chosen remediation path in a user-readable summary
