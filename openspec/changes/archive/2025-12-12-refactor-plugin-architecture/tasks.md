# Implementation Tasks

## Phase 0: Preparation (Week 1)

### 0.1 Repository Setup
- [ ] 0.1.1 Freeze feature development (bug fixes only)
- [ ] 0.1.2 Create `refactor-v2` branch from main
- [ ] 0.1.3 Set up CI/CD for refactor branch
- [ ] 0.1.4 Document baseline metrics (test coverage, performance)

### 0.2 Test Environment
- [ ] 0.2.1 Configure fixed test path `/tmp/ccman-test`
- [ ] 0.2.2 Create test data fixtures
- [ ] 0.2.3 Set up integration test harness
- [ ] 0.2.4 Verify all existing tests pass on baseline

### 0.3 Directory Structure
- [ ] 0.3.1 Create `packages/core/tools/` directory structure
- [ ] 0.3.2 Create `packages/core/services/` directory
- [ ] 0.3.3 Create `packages/core/adapters/` directory
- [ ] 0.3.4 Create `packages/core/compat/` for compatibility layer
- [ ] 0.3.5 Create `packages/core/templates/` for config templates

## Phase 1: Core Refactor (Week 2-3)

### 1.1 Infrastructure & Tool Registry (Week 2)

#### 1.1.1 Base Adapters
- [ ] 1.1.1.1 Implement `FileSystem` adapter (backup, lock, atomic write)
- [ ] 1.1.1.2 Implement `TemplateEngine` (load, render, merge)
- [ ] 1.1.1.3 Implement `PathResolver` (getRootDir, setRootDir, tool paths)
- [ ] 1.1.1.4 Write unit tests for base adapters (>80% coverage)

#### 1.1.2 Tool Registry
- [ ] 1.1.2.1 Define `ToolDescriptor` interface in types
- [ ] 1.1.2.2 Implement `ToolRegistry` class (register, get, list, query)
- [ ] 1.1.2.3 Write unit tests for ToolRegistry
- [ ] 1.1.2.4 Add TypeScript strict null checks

#### 1.1.3 Tool Descriptors for Existing Tools
- [ ] 1.1.3.1 Create `tools/codex/descriptor.ts`
- [ ] 1.1.3.2 Create `tools/claude-code/descriptor.ts`
- [ ] 1.1.3.3 Create `tools/gemini-cli/descriptor.ts`
- [ ] 1.1.3.4 Create `tools/ccman/descriptor.ts` (ccman as tool)

#### 1.1.4 Service Adapters (Migrate from Writers)
- [ ] 1.1.4.1 Migrate `writers/codex.ts` → `tools/codex/service-adapter.ts`
- [ ] 1.1.4.2 Migrate `writers/claude.ts` → `tools/claude-code/service-adapter.ts`
- [ ] 1.1.4.3 Migrate `writers/gemini.ts` → `tools/gemini-cli/service-adapter.ts`
- [ ] 1.1.4.4 Implement `ConfigAdapter` for each tool
- [ ] 1.1.4.5 Implement `McpAdapter` for Claude and Gemini
- [ ] 1.1.4.6 Write unit tests for all adapters

#### 1.1.5 Templates
- [ ] 1.1.5.1 Create `templates/codex/config.toml` and `auth.json`
- [ ] 1.1.5.2 Create `templates/claude/settings.json`
- [ ] 1.1.5.3 Create `templates/gemini/settings.json` and `.env`
- [ ] 1.1.5.4 Validate template syntax and placeholders

### 1.2 Core Services (Week 3)

#### 1.2.1 Provider Service
- [ ] 1.2.1.1 Implement `ProviderService` (list, add, update, delete, apply)
- [ ] 1.2.1.2 Implement provider cloning logic
- [ ] 1.2.1.3 Implement current provider tracking
- [ ] 1.2.1.4 Write unit tests for ProviderService (>80% coverage)

#### 1.2.2 MCP Service
- [ ] 1.2.2.1 Implement `McpService` (list, add, update, delete, apply)
- [ ] 1.2.2.2 Implement multi-tool enablement logic
- [ ] 1.2.2.3 Handle MCP server lifecycle
- [ ] 1.2.2.4 Write unit tests for McpService (>80% coverage)

#### 1.2.3 Config Service
- [ ] 1.2.3.1 Implement `ConfigService` (listPaths, get, update)
- [ ] 1.2.3.2 Implement merge mode support (old-override-new, new-override-old)
- [ ] 1.2.3.3 Write unit tests for ConfigService (>80% coverage)

#### 1.2.4 Sync Service
- [ ] 1.2.4.1 Integrate existing WebDAV logic with new services
- [ ] 1.2.4.2 Update `SyncService` to use ProviderService and McpService
- [ ] 1.2.4.3 Verify encryption/decryption still works
- [ ] 1.2.4.4 Write integration tests for sync operations

#### 1.2.5 Tool Orchestrator
- [ ] 1.2.5.1 Implement `ToolOrchestrator` (high-level API)
- [ ] 1.2.5.2 Combine ProviderService + McpService operations
- [ ] 1.2.5.3 Write unit tests for ToolOrchestrator

#### 1.2.6 Compatibility Layer
- [ ] 1.2.6.1 Implement `createCodexManager()` compatibility wrapper
- [ ] 1.2.6.2 Implement `createClaudeManager()` compatibility wrapper
- [ ] 1.2.6.3 Implement `createGeminiManager()` compatibility wrapper
- [ ] 1.2.6.4 Implement `createMCPManager()` compatibility wrapper
- [ ] 1.2.6.5 Add deprecation warnings to all compat functions
- [ ] 1.2.6.6 Write tests verifying old APIs still work

### 1.3 Validation
- [ ] 1.3.1 All unit tests pass (packages/core)
- [ ] 1.3.2 Test coverage maintained (>80%)
- [ ] 1.3.3 Compatibility layer tests pass
- [ ] 1.3.4 Data format validation (`~/.ccman/*.json` unchanged)
- [ ] 1.3.5 Performance benchmark (no >10% regression)

## Phase 2: CLI Migration (Week 4)

### 2.1 Command Generation
- [ ] 2.1.1 Implement dynamic command generation from ToolRegistry
- [ ] 2.1.2 Create `commands/tool.ts` with unified tool commands
- [ ] 2.1.3 Generate subcommands based on tool capabilities
- [ ] 2.1.4 Add command aliases (e.g., `cc` for `claude-code`)

### 2.2 Command Handlers
- [ ] 2.2.1 Implement `add` command handler using ProviderService
- [ ] 2.2.2 Implement `list` command handler
- [ ] 2.2.3 Implement `use` command handler using ToolOrchestrator
- [ ] 2.2.4 Implement `current` command handler
- [ ] 2.2.5 Implement `edit` command handler
- [ ] 2.2.6 Implement `remove` command handler
- [ ] 2.2.7 Implement `clone` command handler
- [ ] 2.2.8 Implement MCP commands (add, list, edit, remove)

### 2.3 Compatibility Commands
- [ ] 2.3.1 Keep existing `ccman cx` commands with deprecation notices
- [ ] 2.3.2 Keep existing `ccman cc` commands with deprecation notices
- [ ] 2.3.3 Keep existing `ccman gm` commands with deprecation notices
- [ ] 2.3.4 Keep existing `ccman mcp` commands with deprecation notices
- [ ] 2.3.5 Update help text to point to new commands

### 2.4 Testing
- [ ] 2.4.1 Integration tests for all new CLI commands
- [ ] 2.4.2 Integration tests for old CLI commands (via compat layer)
- [ ] 2.4.3 Test interactive prompts work correctly
- [ ] 2.4.4 Test error messages are user-friendly
- [ ] 2.4.5 Manual smoke tests on macOS/Linux/Windows

### 2.5 Documentation
- [ ] 2.5.1 Update CLI help text
- [ ] 2.5.2 Update README with new command examples
- [ ] 2.5.3 Add migration guide for CLI users

## Phase 3: Desktop Migration (Week 5)

### 3.1 Preload API
- [ ] 3.1.1 Expose new Tool APIs via contextBridge
- [ ] 3.1.2 Add `tools.list()` IPC method
- [ ] 3.1.3 Add `provider.*` IPC methods (add, list, apply, etc.)
- [ ] 3.1.4 Add `mcp.*` IPC methods (add, list, apply, etc.)
- [ ] 3.1.5 Keep old IPC methods with deprecation warnings

### 3.2 Main Process Handlers
- [ ] 3.2.1 Implement `tools:list` IPC handler
- [ ] 3.2.2 Implement `provider:add` IPC handler
- [ ] 3.2.3 Implement `provider:list` IPC handler
- [ ] 3.2.4 Implement `provider:apply` IPC handler
- [ ] 3.2.5 Implement `provider:update` IPC handler
- [ ] 3.2.6 Implement `provider:delete` IPC handler
- [ ] 3.2.7 Implement MCP IPC handlers
- [ ] 3.2.8 Keep old IPC handlers for backward compatibility

### 3.3 Renderer Components
- [ ] 3.3.1 Update Sidebar to dynamically render tools from ToolRegistry
- [ ] 3.3.2 Update ProviderList to use new APIs
- [ ] 3.3.3 Update ProviderForm to use new APIs
- [ ] 3.3.4 Update MCP management UI to use new APIs
- [ ] 3.3.5 Update Settings page to use new APIs

### 3.4 Testing
- [ ] 3.4.1 Integration tests for all new IPC handlers
- [ ] 3.4.2 Integration tests for old IPC handlers (via compat)
- [ ] 3.4.3 UI tests for dynamic rendering
- [ ] 3.4.4 Manual smoke tests on macOS/Windows/Linux
- [ ] 3.4.5 Test error handling and user feedback

### 3.5 Documentation
- [ ] 3.5.1 Update Desktop user guide
- [ ] 3.5.2 Update screenshots if UI changed
- [ ] 3.5.3 Add migration notes for Desktop users

## Phase 4: Cleanup & Release (Week 6)

### 4.1 Code Cleanup
- [ ] 4.1.1 Remove dead code (old unused functions)
- [ ] 4.1.2 Consolidate duplicate logic
- [ ] 4.1.3 Run linter and fix all warnings
- [ ] 4.1.4 Update code comments and JSDoc
- [ ] 4.1.5 Verify all TODOs resolved or tracked

### 4.2 Documentation
- [ ] 4.2.1 Update README.md with v2.0 features
- [ ] 4.2.2 Update API documentation
- [ ] 4.2.3 Create architecture documentation
- [ ] 4.2.4 Write "Adding a New Tool" tutorial
- [ ] 4.2.5 Update CONTRIBUTING.md
- [ ] 4.2.6 Write migration guide for users
- [ ] 4.2.7 Write migration guide for developers

### 4.3 Testing
- [ ] 4.3.1 Full regression test suite (all packages)
- [ ] 4.3.2 Performance benchmarks (compare to baseline)
- [ ] 4.3.3 Security audit (file permissions, encryption)
- [ ] 4.3.4 Cross-platform testing (macOS/Windows/Linux)
- [ ] 4.3.5 User acceptance testing (dogfooding)

### 4.4 Release Preparation
- [ ] 4.4.1 Update version to 2.0.0 in all package.json
- [ ] 4.4.2 Write CHANGELOG.md for v2.0.0
- [ ] 4.4.3 Create release notes
- [ ] 4.4.4 Build CLI package
- [ ] 4.4.5 Build Desktop packages (dmg, exe, AppImage)
- [ ] 4.4.6 Test install from packages

### 4.5 Deployment
- [ ] 4.5.1 Merge refactor branch to main
- [ ] 4.5.2 Create git tag v2.0.0
- [ ] 4.5.3 Publish CLI to npm
- [ ] 4.5.4 Publish Desktop releases to GitHub
- [ ] 4.5.5 Update documentation website
- [ ] 4.5.6 Announce release (blog, Twitter, Discord)

### 4.6 Monitoring
- [ ] 4.6.1 Monitor npm download metrics
- [ ] 4.6.2 Monitor GitHub issues for bug reports
- [ ] 4.6.3 Monitor user feedback channels
- [ ] 4.6.4 Track performance metrics in production
- [ ] 4.6.5 Prepare hotfix plan if needed

## Success Criteria

### Technical Metrics
- [ ] All existing features preserved (100%)
- [ ] All unit tests pass (>80% coverage)
- [ ] All integration tests pass (100%)
- [ ] No performance regression (< 10% difference)
- [ ] Cross-platform compatibility verified

### User Experience Metrics
- [ ] Users can upgrade without config changes
- [ ] All CLI commands work (old and new)
- [ ] All Desktop features work
- [ ] Error messages are clear and actionable
- [ ] Documentation is complete and accurate

### Extensibility Metrics
- [ ] Add new tool demo completed (<300 lines)
- [ ] CLI auto-generates commands for new tool
- [ ] Desktop auto-renders UI for new tool
- [ ] Type safety enforced via TypeScript
- [ ] Each adapter independently testable

## Rollback Plan

If critical issues are discovered:
- [ ] Stop deployment immediately
- [ ] Revert merge commit on main branch
- [ ] Publish hotfix version pointing to old code
- [ ] Notify users via GitHub/npm/email
- [ ] Document issue and lessons learned
- [ ] Plan fixes before re-attempting migration

Note: Data format compatibility ensures no user data loss even if rollback needed.
