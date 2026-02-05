# @ccman/core

核心业务逻辑模块，提供服务商管理的所有功能。

## 功能

- ✅ 配置文件管理（`~/.ccman/config.json`）
- ✅ 服务商 CRUD 操作
- ✅ Codex 配置写入（`~/.codex/config.toml` + `auth.json`）
- ✅ Claude Code 配置写入（`~/.claude/settings.json`）
- ✅ 环境隔离（test/development/production）
- ✅ 预设模板（官方 + GMN）

## 使用

```typescript
import {
  initConfig,
  addProvider,
  listProviders,
  switchProvider,
  getCurrentProvider,
} from '@ccman/core'

// 初始化配置
initConfig()

// 添加服务商
const provider = addProvider({
  name: 'My Provider',
  type: 'claude',
  baseUrl: 'https://api.anthropic.com',
  apiKey: 'sk-ant-xxx',
})

// 切换服务商（自动写入 Codex/Claude 配置）
switchProvider(provider.id)

// 获取当前服务商
const current = getCurrentProvider()
```

## API

### 配置管理

- `initConfig()` - 初始化配置文件
- `loadConfig()` - 加载配置
- `saveConfig(config)` - 保存配置

### 服务商管理

- `addProvider(input)` - 添加服务商
- `listProviders()` - 列出所有服务商
- `getProvider(id)` - 根据 ID 获取服务商
- `findProviderByName(name)` - 根据名称查找服务商
- `switchProvider(id)` - 切换服务商
- `getCurrentProvider()` - 获取当前服务商
- `editProvider(id, updates)` - 编辑服务商
- `removeProvider(id)` - 删除服务商
- `cloneProvider(sourceId, newName)` - 克隆服务商

### 预设模板

- `PRESETS` - 所有预设模板
- `getPreset(name)` - 根据名称获取预设
- `listPresets()` - 列出所有预设

### 路径管理

- `getCcmanDir()` - 获取 ccman 配置目录
- `getCodexDir()` - 获取 Codex 配置目录
- `getClaudeDir()` - 获取 Claude Code 配置目录
- `getConfigPath()` - 获取 ccman 配置文件路径
- `__setTestPaths(paths)` - 设置测试路径（仅测试环境）

## 测试

```bash
pnpm test
```

## 设计原则

- **安全写入**：写入前备份；Codex 的 `config.toml/auth.json` 备份后覆盖写入，其他工具尽量保留用户字段
- **原子操作**：使用 write temp + rename 保证原子性
- **硬编码 Writers**：直接实现 `writeCodexConfig` 和 `writeClaudeConfig`，不做抽象层
- **同步 I/O**：配置文件小，使用同步操作更简单
- **环境隔离**：使用 NODE_ENV 自动切换路径

## 依赖

- `@iarna/toml` - TOML 解析（Codex 配置）
- `proper-lockfile` - 文件锁（防并发写入）
