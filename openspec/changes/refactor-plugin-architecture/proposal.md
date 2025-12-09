# Change: Refactor to Plugin-Based Architecture

## Why

The current architecture requires modifying multiple files when adding new tools (Codex, Claude Code, Gemini CLI), making extensibility difficult. Template usage is inconsistent with some configuration hardcoded in code, and ccman itself is not abstracted as a tool instance. This limits scalability and maintainability as the project grows.

## What Changes

This is a **COMPLETE ARCHITECTURE REFACTOR** that transforms ccman into a true plugin-based system with "Tool as Plugin" architecture:

- **Core Architecture**:
  - **BREAKING**: Replace factory functions (`createCodexManager`, etc.) with unified Services
  - Introduce `ToolRegistry` for dynamic tool discovery and registration
  - Introduce layered architecture: Interface → Core Services → Tool Drivers → Adapters

- **Tool Management**:
  - **NEW**: `ToolDescriptor` interface - each tool declares its capabilities, config paths, and adapters
  - **NEW**: Tool drivers as plugins under `packages/core/tools/<tool-name>/`
  - **BREAKING**: Abstract ccman itself as a tool instance (previously not abstracted)

- **Service Layer**:
  - **NEW**: `ProviderService` - unified provider management across all tools
  - **NEW**: `McpService` - unified MCP management
  - **NEW**: `ConfigService` - unified config file operations
  - **NEW**: `ToolOrchestrator` - high-level API combining multiple services
  - **UPDATED**: `SyncService` - reuse existing logic with new service integration

- **Adapter System**:
  - **NEW**: `ServiceAdapter` - maps Provider → tool's official config
  - **NEW**: `McpAdapter` - maps MCP servers → tool's official config
  - **NEW**: `ConfigAdapter` - reads/writes/merges tool config files
  - **BREAKING**: Replace existing `writers/` with adapter pattern

- **Template System**:
  - **NEW**: `TemplateEngine` - unified template rendering and merging
  - **NEW**: File-based templates in `packages/core/templates/<tool>/`
  - **BREAKING**: Remove hardcoded configuration strings from code

- **Path Management**:
  - **NEW**: `getRootDir()` / `setRootDir()` - persistent root directory configuration
  - **NEW**: Support `CCMAN_ROOT` env var, `~/.ccmanrc` persistence
  - **FIXED**: Test environment path is now `/tmp/ccman-test` (no PID suffix)

- **CLI/Desktop**:
  - **NEW**: Commands and UI dynamically generated from `ToolRegistry`
  - **BREAKING**: Old commands marked `@deprecated` but retained for compatibility
  - **NEW**: Unified command structure: `ccman tool <tool-id> <action>`

## Impact

### Affected Specs
This change affects the entire codebase:
- **NEW**: `core-architecture` - layered architecture design
- **NEW**: `tool-registry` - tool registration and discovery
- **NEW**: `provider-service` - provider CRUD and application
- **NEW**: `mcp-service` - MCP CRUD and application
- **NEW**: `config-service` - configuration management
- **NEW**: `template-system` - template rendering and merging

### Affected Code
Major changes across all packages:
- `packages/core/src/` - complete restructure into services/, tools/, adapters/
- `packages/core/templates/` - new template files
- `packages/cli/src/` - command generation logic
- `packages/desktop/src/` - UI rendering logic

### Migration Strategy
- **6-week phased migration** (see tasks.md)
- **Backward compatible**: Old APIs retained via compatibility layer
- **Data compatible**: `~/.ccman/*.json` format unchanged
- **Zero user impact**: All existing CLI commands and Desktop features work as before
- **Rollback ready**: Can revert at any stage

### Benefits
- **Extensibility**: Add new tool with 200-300 lines of code, no CLI/Desktop changes
- **Consistency**: All tools managed through unified interfaces
- **Testability**: Each adapter independently testable
- **Type Safety**: TypeScript interfaces enforce correct implementations
- **Maintainability**: Clear separation of concerns across layers

### Risks
- **Complexity**: Introducing new abstractions requires careful documentation
- **Testing**: Extensive migration testing needed to ensure no regressions
- **Learning Curve**: Contributors need to learn new architecture patterns

### Success Criteria
- ✅ All existing features preserved (100%)
- ✅ All tests pass (>80% coverage maintained)
- ✅ No performance regression (<10% difference)
- ✅ Add new tool demo completed (<300 lines)
- ✅ CLI and Desktop work unchanged from user perspective
