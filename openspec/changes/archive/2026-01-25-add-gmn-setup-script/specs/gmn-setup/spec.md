## ADDED Requirements
### Requirement: GMN setup script
The system SHALL provide a script that configures the GMN provider for Claude Code, Codex, Gemini CLI, and OpenCode using a single API key input.

#### Scenario: Configure all tools by default
- **WHEN** the user runs the script without specifying platforms
- **THEN** the script SHALL apply GMN configuration to Claude Code, Codex, Gemini CLI, and OpenCode

#### Scenario: Configure selected tools only
- **WHEN** the user provides a platform list
- **THEN** the script SHALL only apply GMN configuration to the selected tools

#### Scenario: Reuse existing GMN provider
- **WHEN** a GMN provider already exists for a tool
- **THEN** the script SHALL update the provider's baseUrl and apiKey, then switch to it
