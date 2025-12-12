# Core Architecture Specification

## ADDED Requirements

### Requirement: Layered Architecture

The system SHALL implement a 4-layer architecture: Interface → Core Services → Tool Drivers → Adapters.

#### Scenario: Service layer isolation
- **GIVEN** a new tool is added
- **WHEN** the tool driver is implemented
- **THEN** no changes SHALL be required in the Core Services layer

#### Scenario: Tool-specific logic containment
- **GIVEN** a tool has unique configuration format (TOML, JSON, .env)
- **WHEN** configuration needs to be read or written
- **THEN** the tool driver adapter SHALL handle the format
- **AND** Core Services SHALL remain format-agnostic

#### Scenario: Independent layer testing
- **GIVEN** any layer in the architecture
- **WHEN** unit tests are executed
- **THEN** each layer SHALL be testable without dependencies on other layers

### Requirement: Backward Compatibility

The system SHALL maintain 100% backward compatibility via a compatibility layer.

#### Scenario: Old factory functions continue working
- **GIVEN** existing code using `createCodexManager()`
- **WHEN** the function is called
- **THEN** it SHALL return a working ToolManager instance
- **AND** emit a deprecation warning
- **AND** proxy all operations to new ProviderService

#### Scenario: Data format unchanged
- **GIVEN** existing `~/.ccman/*.json` configuration files
- **WHEN** the new architecture is deployed
- **THEN** all files SHALL remain readable
- **AND** file format SHALL NOT change
- **AND** all existing fields SHALL be preserved

#### Scenario: User workflows unaffected
- **GIVEN** a user with existing CLI scripts
- **WHEN** upgrading to v2.0
- **THEN** all scripts SHALL continue functioning
- **AND** no user intervention SHALL be required

### Requirement: Type Safety

The system SHALL enforce compile-time type safety using TypeScript interfaces.

#### Scenario: Adapter interface compliance
- **GIVEN** a tool implements ServiceAdapter interface
- **WHEN** the code is compiled
- **THEN** TypeScript SHALL enforce all required methods are present
- **AND** parameter types SHALL match interface definition

#### Scenario: Invalid tool registration rejected
- **GIVEN** a ToolDescriptor missing required fields
- **WHEN** attempting to compile
- **THEN** TypeScript compiler SHALL produce an error
- **AND** prevent building invalid configuration

### Requirement: Zero Breaking Changes for Users

The system MUST NOT introduce breaking changes in user-facing APIs or data formats.

#### Scenario: CLI commands preserved
- **GIVEN** existing CLI commands like `ccman cx use <id>`
- **WHEN** v2.0 is released
- **THEN** commands SHALL continue working
- **AND** produce identical results as v1.x

#### Scenario: Desktop features preserved
- **GIVEN** existing Desktop UI workflows (add, edit, delete providers)
- **WHEN** v2.0 is released
- **THEN** all workflows SHALL continue functioning
- **AND** data SHALL remain compatible

### Requirement: Performance Baseline

The system SHALL NOT regress performance by more than 10% compared to baseline.

#### Scenario: Provider switching performance
- **GIVEN** baseline provider switch time measured
- **WHEN** switching provider in new architecture
- **THEN** operation time SHALL be within 110% of baseline

#### Scenario: Config file read performance
- **GIVEN** baseline config read time measured
- **WHEN** reading config in new architecture
- **THEN** operation time SHALL be within 110% of baseline
