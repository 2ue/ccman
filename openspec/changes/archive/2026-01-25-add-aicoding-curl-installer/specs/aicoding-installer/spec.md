## ADDED Requirements
### Requirement: Curl-based aicoding launcher
The repository SHALL provide a curl-installable shell script that launches the aicoding interactive setup without requiring global installation.

#### Scenario: Run via curl pipe
- **WHEN** the user runs the script via `curl ... | bash`
- **THEN** the script runs `@2ue/aicoding` and prompts interactively

#### Scenario: Run with extra arguments
- **WHEN** the user passes arguments after `--` to the script
- **THEN** the script forwards them to `@2ue/aicoding`

### Requirement: Consistent interactive prompts
The aicoding interactive flow SHALL match `ccman gmn` in fields and ordering (platforms → OpenAI Base URL when needed → API key), with a clear selection UI.

#### Scenario: Prompt order alignment
- **WHEN** the user runs aicoding without CLI arguments
- **THEN** the prompts follow platform selection, OpenAI Base URL selection if needed, and API key input

#### Scenario: Selection UI matches gmn
- **WHEN** the user chooses platforms or OpenAI Base URL
- **THEN** aicoding presents the same selection style as `ccman gmn`
