# Template System Specification

## ADDED Requirements

### Requirement: File-Based Templates

The system SHALL store all configuration templates as files in native format under `packages/core/templates/<tool>/`.

#### Scenario: Template file organization
- **GIVEN** a tool "claude-code"
- **WHEN** templates are defined
- **THEN** templates SHALL be stored in `templates/claude/settings.json`
- **AND** file SHALL be in native JSON format (not embedded string)

#### Scenario: Template discovery
- **GIVEN** a ToolDescriptor with templates array
- **WHEN** ServiceAdapter needs to generate config
- **THEN** it SHALL load template from file path specified in TemplateSpec
- **AND** file SHALL exist at specified path

### Requirement: Template Rendering

The system SHALL support placeholder replacement in templates.

#### Scenario: Simple placeholder
- **GIVEN** template with `{{provider.apiKey}}`
- **AND** data object { provider: { apiKey: 'sk-xxx' } }
- **WHEN** `TemplateEngine.render(template, data)` is called
- **THEN** output SHALL replace `{{provider.apiKey}}` with 'sk-xxx'

#### Scenario: Nested placeholder
- **GIVEN** template with `{{provider.model.name}}`
- **AND** data object { provider: { model: { name: 'gpt-4' } } }
- **WHEN** rendered
- **THEN** output SHALL contain 'gpt-4'

#### Scenario: Default value
- **GIVEN** template with `{{provider.model|default:'gpt-5-codex'}}`
- **AND** data object without provider.model
- **WHEN** rendered
- **THEN** output SHALL contain 'gpt-5-codex'

#### Scenario: Missing placeholder without default
- **GIVEN** template with `{{provider.missing}}`
- **AND** data object without provider.missing
- **WHEN** rendered
- **THEN** it SHALL either throw error or output empty string (implementation choice)

### Requirement: Deep Config Merging

The system SHALL support deep merging of template output with existing configurations.

#### Scenario: Old-override-new merge
- **GIVEN** existing config { env: { A: 1, B: 2 }, other: { X: 10 } }
- **AND** template output { env: { B: 3, C: 4 } }
- **WHEN** `TemplateEngine.merge(existing, template, 'old-override-new')` is called
- **THEN** result SHALL be { env: { A: 1, B: 2, C: 4 }, other: { X: 10 } }
- **AND** existing.env.B SHALL be preserved (old wins)
- **AND** existing.other SHALL be preserved
- **AND** template.env.C SHALL be added

#### Scenario: New-override-old merge
- **GIVEN** same inputs as above
- **WHEN** mode is 'new-override-old'
- **THEN** result.env.B SHALL be 3 (new wins)

#### Scenario: Array merging
- **GIVEN** existing config { list: ['a', 'b'] }
- **AND** template output { list: ['c', 'd'] }
- **WHEN** merged
- **THEN** merge behavior SHALL be configurable (replace vs concat)
- **AND** default SHALL be replace (template array replaces existing)

### Requirement: Zero Hardcoded Configs

The system SHALL eliminate all hardcoded configuration strings from code.

#### Scenario: No inline JSON/TOML/env strings
- **GIVEN** any ServiceAdapter implementation
- **WHEN** code is reviewed
- **THEN** no multi-line config strings SHALL exist in code
- **AND** all config generation SHALL use file templates

#### Scenario: Config changes via file edits
- **GIVEN** a need to change default config template
- **WHEN** template file is edited
- **THEN** change SHALL take effect without code changes
- **AND** no recompilation SHALL be required (templates loaded at runtime)

### Requirement: Template Syntax Simplicity

Template syntax SHALL be minimal and easy to understand.

#### Scenario: Supported syntax
- **WHEN** defining templates
- **THEN** syntax SHALL support:
- **AND** Simple replacement: `{{key}}`
- **AND** Nested access: `{{obj.nested.key}}`
- **AND** Default values: `{{key|default:'value'}}`

#### Scenario: No complex logic in templates
- **WHEN** defining templates
- **THEN** conditionals (if/else) SHALL NOT be required initially
- **AND** loops (each/for) SHALL NOT be required initially
- **AND** complex logic SHALL be handled in code, not templates
