# CCM 开发文档

本文档提供 CCM (Claude Code Manager) 的详细开发指南。

## 目录

- [项目架构](#项目架构)
- [核心模块](#核心模块)
- [开发环境设置](#开发环境设置)
- [配置文件详解](#配置文件详解)
- [开发流程](#开发流程)
- [安全注意事项](#安全注意事项)
- [测试](#测试)

## 项目架构

### v2.x 架构设计

CCM v2.x 采用全新架构:
- **直接配置修改**: 直接修改 `~/.claude/settings.json` 实现配置切换
- **多供应商支持**: 在 `~/.ccman/providers/` 目录存储多个供应商配置
- **零 shell 依赖**: 无需修改 shell 配置文件,立即生效
- **安全备份**: 每次切换前自动备份当前配置

### 目录结构

```
src/
├── types/                    # TypeScript 类型定义
│   └── index.ts             # 核心类型接口
├── core/                     # 核心模块
│   ├── CCMConfigManager.ts  # CCM 配置管理器
│   └── ClaudeConfigManager.ts # Claude 配置管理器
├── providers/                # 供应商管理
│   └── ProviderManager.ts   # 供应商业务逻辑
├── commands/                 # 命令处理
│   └── lang.ts              # 语言命令处理
├── i18n/                     # 国际化
│   ├── LanguageManager.ts   # 语言管理器
│   └── messages.ts          # 多语言消息
├── utils/                    # 工具函数
│   ├── env-config.ts        # 环境配置
│   └── version.ts           # 版本信息
├── config/                   # 配置文件
│   ├── static-env.ts        # 静态环境配置
│   └── default-providers.ts # 默认供应商配置
├── cli.ts                    # CLI 入口点
└── index.ts                 # 模块导出
```

## 核心模块

### 1. CCMConfigManager

负责管理 CCM 主配置文件 (`~/.ccman/config.json`)

**主要功能**:
- 读取/写入 CCM 配置
- 管理供应商列表
- 处理首次运行
- 语言设置管理

**关键方法**:
```typescript
class CCMConfigManager {
  loadConfig(): CCMConfig              // 加载配置
  saveConfig(config: CCMConfig): void  // 保存配置
  getCurrentProvider(): string         // 获取当前供应商
  setCurrentProvider(id: string): void // 设置当前供应商
}
```

### 2. ClaudeConfigManager

负责管理 Claude Code 配置文件 (`~/.claude/settings.json`)

**主要功能**:
- 读取/写入 Claude 配置
- 选择性更新(仅修改 CCM 管理的键)
- 配置备份

**关键方法**:
```typescript
class ClaudeConfigManager {
  loadConfig(): ClaudeSettings         // 加载 Claude 配置
  updateConfig(config: Partial<ClaudeSettings>): void  // 更新配置
  backupConfig(): void                 // 备份配置
}
```

**CCM 管理的配置键**:
```typescript
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": string,
    "ANTHROPIC_BASE_URL": string,
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": number,
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": number
  },
  "permissions": {
    "allow": string[],
    "deny": string[]
  }
}
```

### 3. ProviderManager

负责供应商配置的业务逻辑

**主要功能**:
- 添加/删除/更新供应商
- 切换供应商
- 列出供应商
- 供应商配置验证

**关键方法**:
```typescript
class ProviderManager {
  addProvider(config: ProviderConfig): void    // 添加供应商
  removeProvider(id: string): void             // 删除供应商
  switchProvider(id: string): void             // 切换供应商
  listProviders(): ProviderConfig[]            // 列出所有供应商
}
```

### 4. LanguageManager

负责多语言支持

**主要功能**:
- 语言检测
- 语言切换
- 多语言消息管理

**关键方法**:
```typescript
class LanguageManager {
  getCurrentLanguage(): LanguageCode           // 获取当前语言
  setLanguage(lang: LanguageCode): void        // 设置语言
  getMessage(key: string): string              // 获取翻译消息
}
```

## 开发环境设置

### 环境准备

```bash
# 克隆仓库
git clone https://github.com/2ue/ccman.git
cd ccman

# 安装依赖
pnpm install
```

### 开发命令

```bash
pnpm run dev                 # 开发模式运行(使用 tsx)
pnpm run build               # TypeScript 编译
pnpm run build:dev           # 开发环境编译
pnpm run start               # 运行编译后的 CLI
pnpm run clean               # 清理 dist/ 目录
pnpm run lint                # ESLint 代码检查
pnpm test                    # 运行测试
```

### 开发环境隔离

为避免影响生产配置,使用隔离的开发环境:

```bash
# 设置开发环境配置路径
export CCM_CONFIG_DIR=".ccman-dev"
export CLAUDE_CONFIG_PATH="$HOME/.claude/settings-dev.json"

# 在隔离环境中运行
pnpm run dev
```

或在代码中使用环境变量:

```typescript
const configDir = process.env.CCM_CONFIG_DIR ||
  path.join(os.homedir(), '.ccman');
```

## 配置文件详解

### CCM 主配置 (~/.ccman/config.json)

```json
{
  "currentProvider": "anthropic",
  "claudeConfigPath": "/Users/user/.claude/settings.json",
  "providers": {
    "anthropic": {
      "name": "Anthropic Official",
      "configFile": "anthropic.json",
      "lastUsed": "2025-01-15T10:30:00.000Z"
    }
  },
  "settings": {
    "language": "zh",
    "firstRun": false
  },
  "metadata": {
    "version": "2.1.4",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### 供应商配置 (~/.ccman/providers/anthropic.json)

```json
{
  "name": "Anthropic Official",
  "description": "Official Anthropic API",
  "config": {
    "env": {
      "ANTHROPIC_AUTH_TOKEN": "sk-xxx",
      "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
      "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1,
      "CLAUDE_CODE_MAX_OUTPUT_TOKENS": 32000
    },
    "permissions": {
      "allow": [],
      "deny": []
    }
  },
  "metadata": {
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "usageCount": 25
  }
}
```

## 开发流程

### 1. 添加新功能

```bash
# 1. 创建特性分支
git checkout -b feature/new-feature

# 2. 开发(使用开发环境隔离)
export CCM_CONFIG_DIR=".ccman-dev"
pnpm run dev

# 3. 测试
pnpm test

# 4. 代码检查
pnpm run lint

# 5. 提交更改
git add .
git commit -m "feat: add new feature"
```

### 2. 修复 Bug

```bash
# 1. 创建修复分支
git checkout -b fix/bug-description

# 2. 修复并测试
pnpm run dev

# 3. 提交更改
git commit -m "fix: bug description"
```

### 3. 发布流程

参见 [版本发布指南](./release-guide.md)

## 安全注意事项

### 🚨 开发时的重要限制

**绝对禁止修改以下文件(会导致系统不可用)**:
- `~/.ccman/config.json` - 现有历史配置文件
- `~/.claude/settings.json` - Claude Code 配置文件

### 开发安全做法

1. **使用测试目录**: 开发时使用 `~/.ccman-dev/` 或其他测试目录
2. **配置隔离**: 通过环境变量指定不同的配置路径
3. **备份验证**: 修改前确保备份机制正常工作
4. **分步测试**: 先测试读取,再测试写入功能

### 配置保护机制

CCM 实现了选择性配置更新:

```typescript
// ✅ 正确: 只更新 CCM 管理的键
function updateClaudeConfig(newConfig: Partial<ClaudeSettings>) {
  const currentConfig = loadClaudeConfig();

  // 只更新 CCM 管理的键
  const updatedConfig = {
    ...currentConfig,
    env: {
      ...currentConfig.env,
      ANTHROPIC_AUTH_TOKEN: newConfig.env?.ANTHROPIC_AUTH_TOKEN,
      ANTHROPIC_BASE_URL: newConfig.env?.ANTHROPIC_BASE_URL,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: newConfig.env?.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC,
      CLAUDE_CODE_MAX_OUTPUT_TOKENS: newConfig.env?.CLAUDE_CODE_MAX_OUTPUT_TOKENS
    },
    permissions: newConfig.permissions
  };

  saveClaudeConfig(updatedConfig);
}

// ❌ 错误: 完全覆盖配置
function updateClaudeConfig(newConfig: ClaudeSettings) {
  saveClaudeConfig(newConfig); // 会丢失用户的其他配置
}
```

## 测试

### 功能测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test src/core/CCMConfigManager.test.ts

# 查看测试覆盖率
pnpm test --coverage
```

### 手动测试清单

- [ ] 首次运行流程
- [ ] 添加供应商
- [ ] 切换供应商
- [ ] 删除供应商
- [ ] 语言切换
- [ ] 配置备份恢复
- [ ] 错误处理
- [ ] 配置文件完整性

### 集成测试

```bash
# 1. 构建项目
pnpm run build

# 2. 本地安装测试
pnpm run publish:local

# 3. 测试 CLI 命令
ccman
ccman ls
ccman add test "Test Provider" https://api.test.com
ccman use test
```

## TypeScript 配置

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 依赖管理

### 生产依赖

- **chalk**: 终端彩色输出
- **commander**: CLI 框架
- **inquirer**: 交互式命令行界面
- **fs-extra**: 增强的文件系统操作

### 开发依赖

- **typescript**: TypeScript 编译器
- **tsx**: TypeScript 执行器
- **eslint**: 代码检查
- **jest**: 测试框架
- **@types/***: TypeScript 类型定义

## 常见问题

### Q: 如何调试 CLI?

```bash
# 使用 tsx 直接运行
pnpm run dev

# 使用 Node.js 调试器
node --inspect-brk dist/cli.js
```

### Q: 如何添加新的供应商预设?

编辑 `src/config/default-providers.ts`:

```typescript
export const DEFAULT_PROVIDERS = {
  'new-provider': {
    name: 'New Provider',
    description: 'Description',
    config: {
      env: {
        ANTHROPIC_AUTH_TOKEN: '',
        ANTHROPIC_BASE_URL: 'https://api.new-provider.com',
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
        CLAUDE_CODE_MAX_OUTPUT_TOKENS: 32000
      },
      permissions: { allow: [], deny: [] }
    }
  }
};
```

### Q: 如何添加新的语言支持?

1. 在 `src/i18n/messages.ts` 中添加翻译:

```typescript
export const messages = {
  zh: { /* 中文消息 */ },
  en: { /* 英文消息 */ },
  ja: { /* 日文消息 */ }  // 新增
};
```

2. 更新 `LanguageCode` 类型定义

## 贡献指南

参见主 [README.md](../README.md#贡献) 的贡献部分。

## 相关文档

- [版本发布指南](./release-guide.md)
- [脚本使用指南](./scripts-guide.md)
- [NPM 发布指南](./npm-publish-guide.md)
- [版本管理](./version-management.md)

---

更新时间: 2025-09-30