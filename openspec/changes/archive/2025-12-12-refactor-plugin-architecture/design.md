# Design: Plugin-Based Architecture

## Context

ccman currently supports 3 main tools (Codex, Claude Code, Gemini CLI) plus MCP management. While functional, the architecture has scalability limitations:

### Current Issues
1. **Adding new tools requires changes in 5+ files**: factory functions, writers, CLI commands, Desktop UI
2. **Inconsistent template usage**: Some configs hardcoded as strings, others use file templates
3. **Tool behaviors not fully unified**: Each tool has slightly different APIs despite similar operations
4. **ccman not abstracted**: Unlike the tools it manages, ccman itself is not treated as a tool instance

### Constraints
- Must maintain 100% backward compatibility (data formats and user-facing APIs)
- Zero breaking changes for end users
- Must preserve all existing features
- Performance cannot regress

### Stakeholders
- **End Users**: Need seamless migration, no changes to workflows
- **CLI Users**: Existing commands must continue working
- **Desktop Users**: All UI features must be preserved
- **Contributors**: Need clear patterns for adding new tools

## Goals / Non-Goals

### Goals
1. **True Extensibility**: Add new tool with 200-300 lines, zero changes to CLI/Desktop
2. **Unified Interfaces**: All tools managed through consistent adapter patterns
3. **Template-Driven**: All configuration generation from file templates
4. **Type Safety**: Compile-time checks via TypeScript interfaces
5. **Maintainability**: Clear layered architecture with single responsibility

### Non-Goals
- Not changing data formats (`~/.ccman/*.json` remains same)
- Not introducing new external dependencies (reuse existing: fs, path, toml)
- Not building runtime plugin loading (tools registered at compile time)
- Not rewriting functionality (migrate existing logic to new structure)

## Decisions

### Decision 1: Layered Architecture

**Chosen Approach**: 4-layer architecture

```
┌─────────────────────────────────────┐
│  Interface Layer (CLI/Desktop)      │  ← User interaction
├─────────────────────────────────────┤
│  Core Services Layer                │  ← Business logic
│  (ProviderService, McpService, etc) │
├─────────────────────────────────────┤
│  Tool Drivers Layer                 │  ← Tool-specific adapters
│  (tools/<tool-name>/)               │
├─────────────────────────────────────┤
│  Adapters Layer                     │  ← Infrastructure
│  (fs, template, crypto, webdav)     │
└─────────────────────────────────────┘
```

**Rationale**:
- Clear separation of concerns
- Each layer has single responsibility
- Easy to test each layer independently
- Core Services don't depend on specific tools

**Alternatives Considered**:
1. **Monolithic approach** (current): Rejected, doesn't scale
2. **3-layer (no Tool Drivers)**: Rejected, would leak tool-specific logic into Services
3. **Plugin loader at runtime**: Rejected, adds complexity without clear benefit

### Decision 2: ToolDescriptor as Plugin Contract

**Chosen Approach**: Each tool provides a `ToolDescriptor` declaring:
- Basic info (id, short name, display name)
- Config file paths and formats
- Adapters (ServiceAdapter, McpAdapter, ConfigAdapter)
- Templates and presets
- Capabilities (service, mcp, config)

**Example**:
```typescript
interface ToolDescriptor {
  id: Tool;
  short: string;
  displayName: string;
  configPaths: ConfigPath[];
  adapters: {
    config?: ConfigAdapter;
    service?: ServiceAdapter;
    mcp?: McpAdapter;
  };
  templates?: TemplateSpec[];
  presets?: PresetSpec[];
  capabilities: ('service'|'mcp'|'config')[];
}
```

**Rationale**:
- Declarative: Tool capabilities declared upfront
- Type-safe: TypeScript enforces interface compliance
- Discoverable: ToolRegistry can query capabilities
- Self-contained: All tool logic in one directory

**Alternatives Considered**:
1. **Convention-based (no descriptor)**: Rejected, loses type safety and discoverability
2. **Annotation-based (@Tool decorator)**: Rejected, unnecessary complexity for compile-time registration

### Decision 3: Adapter Pattern for Tool Integration

**Chosen Approach**: Three adapter types per tool:

1. **ConfigAdapter**: Read/write/merge config files
2. **ServiceAdapter**: Map `Provider` → tool's official config
3. **McpAdapter**: Map `MCPServer[]` → tool's official config

**Rationale**:
- **Isolation**: Each tool's config logic is isolated
- **Zero Hardcoding**: Core Services don't know about specific config formats (TOML, JSON, .env)
- **Testability**: Each adapter can be unit tested independently
- **Flexibility**: Tools can have multiple config files, different formats, different merge strategies

**Alternatives Considered**:
1. **Single adapter per tool**: Rejected, mixing concerns (config read/write vs provider mapping)
2. **No adapters (Services handle all)**: Rejected, Services would become tool-specific

### Decision 4: File-Based Templates

**Chosen Approach**: All config templates stored as files in `packages/core/templates/<tool>/`

**Structure**:
```
templates/
├── codex/
│   ├── config.toml
│   └── auth.json
├── claude/
│   └── settings.json
└── gemini/
    ├── settings.json
    └── .env
```

**Template Syntax**:
- Simple: `{{provider.apiKey}}`
- With defaults: `{{provider.model|default:'gpt-5-codex'}}`

**Rationale**:
- **DRY**: No duplication between code and templates
- **Versionable**: Templates tracked in git, easier to review changes
- **Editable**: Non-developers can fix templates without code changes
- **Native Format**: Templates in native format (TOML, JSON, .env), not embedded strings

**Alternatives Considered**:
1. **Inline templates (current)**: Rejected, hard to maintain, version, and review
2. **External template engine (Handlebars, Mustache)**: Rejected, unnecessary dependency for simple replacement

### Decision 5: Backward Compatibility via Compat Layer

**Chosen Approach**: Keep old APIs via compatibility layer:

```typescript
// packages/core/compat/tool-manager.ts
export function createCodexManager(): ToolManager {
  console.warn('[Deprecated] Use ProviderService instead');
  return {
    add: (input) => ProviderService.add('codex', input),
    list: () => ProviderService.list('codex'),
    switch: (id) => ProviderService.apply('codex', id),
    // ... other methods
  };
}
```

**Rationale**:
- **Zero Breaking Changes**: Existing code continues working
- **Gradual Migration**: Users can migrate at their own pace
- **Clear Deprecation Path**: Warnings guide users to new APIs

**Alternatives Considered**:
1. **Big bang migration**: Rejected, too risky, breaks user code
2. **No compatibility**: Rejected, violates "Never break userspace" principle

### Decision 6: Root Directory Management

**Chosen Approach**: Persistent root directory with priority chain:

1. `CCMAN_ROOT` env var (highest)
2. `~/.ccmanrc` persistent config
3. `NODE_ENV=test` → `/tmp/ccman-test` (fixed, no PID)
4. `NODE_ENV=development` → `/tmp/ccman-dev`
5. Default → `os.homedir()`

**API**:
```typescript
getRootDir(): string
setRootDir(root: string): void  // Persists to ~/.ccmanrc
resetRootDir(): void
```

**Rationale**:
- **Flexibility**: Users can switch root for testing or multi-environment setups
- **Persistence**: Changes survive process restarts
- **Test-Friendly**: Fixed test path easier to clean up
- **Override**: Env var allows temporary overrides

**Alternatives Considered**:
1. **Current (PID-based test paths)**: Rejected, test cleanup difficult, paths change on restart
2. **Only env var**: Rejected, not persistent across sessions

### Decision 7: Dynamic CLI/UI Generation

**Chosen Approach**: Generate commands and UI from `ToolRegistry`

**CLI Example**:
```typescript
const tools = ToolRegistry.list();
tools.forEach(tool => {
  const cmd = new Command(tool.id).alias(tool.short);

  if (tool.capabilities.includes('service')) {
    cmd.command('add').action(() => { /* ... */ });
    cmd.command('use <name>').action(() => { /* ... */ });
    // ... other service commands
  }

  if (tool.capabilities.includes('mcp')) {
    // ... MCP commands
  }

  program.addCommand(cmd);
});
```

**Rationale**:
- **DRY**: Single command generation logic for all tools
- **Automatic**: New tools get CLI/UI for free
- **Consistent**: All tools have identical command structure

**Alternatives Considered**:
1. **Manual commands** (current): Rejected, doesn't scale
2. **Command DSL**: Rejected, unnecessary complexity

## Risks / Trade-offs

### Risk 1: Increased Abstraction Complexity
**Impact**: Contributors need to learn layered architecture and adapter patterns

**Mitigation**:
- Comprehensive documentation in `docs/refactor-v2/`
- Step-by-step "Add New Tool" guide with complete example
- Clear separation between layers reduces cognitive load per layer

### Risk 2: Migration Bugs
**Impact**: Compatibility layer or adapter logic could have bugs causing regressions

**Mitigation**:
- **Phased rollout**: 6 weeks with validation at each phase
- **Extensive testing**: >80% test coverage maintained
- **Compatibility tests**: Verify old APIs still work
- **Data format tests**: Ensure `~/.ccman/*.json` unchanged
- **Rollback plan**: Can revert at any phase

### Risk 3: Performance Regression
**Impact**: Additional abstraction layers could slow down operations

**Mitigation**:
- **Benchmark tests**: Measure before/after performance
- **Lazy loading**: ToolRegistry only loads descriptors once
- **Caching**: Config reads cached when appropriate
- **Target**: <10% performance difference acceptable

### Risk 4: Learning Curve for Contributors
**Impact**: New contributors may struggle with architecture

**Mitigation**:
- **Tutorial**: "Add New Tool in 10 Steps" guide
- **Example**: Complete CodeBuddy CLI implementation included
- **Templates**: Provide templates for new tool skeleton
- **Documentation**: Clear API docs and architecture diagrams

## Migration Plan

### Phase 0: Preparation (Week 1)
- Freeze new features
- Create `refactor-v2` branch
- Set up test infrastructure

### Phase 1: Core Refactor (Week 2-3)
- Implement ToolRegistry, Services, Adapters
- Create ToolDescriptors for existing 3 tools
- Build compatibility layer
- **Validation**: All tests pass, old APIs work

### Phase 2: CLI Migration (Week 4)
- Implement dynamic command generation
- Keep old commands with deprecation warnings
- **Validation**: All CLI commands work (old and new)

### Phase 3: Desktop Migration (Week 5)
- Implement dynamic UI rendering
- Keep old IPC handlers with deprecation warnings
- **Validation**: All Desktop features work

### Phase 4: Cleanup & Release (Week 6)
- Full regression testing
- Update documentation
- Package and release v2.0.0
- **Validation**: All success criteria met

### Rollback Strategy
If critical issues found:
1. Stop deployment immediately
2. Revert merge commit on main branch
3. Publish hotfix pointing to old code
4. Notify users with rollback instructions
5. Data format compatibility ensures no data loss

## Open Questions

### Q1: Should we support runtime plugin loading in the future?
**Status**: Deferred to v3.0

**Pros**: Third-party plugins, no recompile for new tools
**Cons**: Security concerns, API stability requirements, complexity

**Decision**: Start with compile-time registration. Re-evaluate if clear demand emerges.

### Q2: Should template syntax be more powerful (conditionals, loops)?
**Status**: Deferred

**Current**: Simple `{{key}}` and `{{key|default:value}}`
**Potential**: `{{#if}}`, `{{#each}}`

**Decision**: Start simple. Add complexity only if proven necessary by real use cases.

### Q3: Should we support per-tool custom commands in CLI?
**Status**: Deferred

**Example**: `ccman codex analyze-code` (Codex-specific command)

**Decision**: Start with unified commands (add/list/use/etc). Revisit if specific tool needs arise.

## References

- Architecture Design: `docs/refactor-v2/01-新架构设计.md`
- API Reference: `docs/refactor-v2/02-核心API定义.md`
- Add Tool Guide: `docs/refactor-v2/03-新工具添加指南.md`
- Migration Plan: `docs/refactor-v2/04-迁移计划.md`
