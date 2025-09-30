# Setup 功能集成方案

## 现有代码架构分析

### 当前目录结构
```
src/
├── core/                          # 核心模块
│   ├── CCMConfigManager.ts       # CCM 配置管理（已有）
│   └── ClaudeConfigManager.ts    # Claude 配置管理（已有）
├── providers/                     # 供应商管理
│   └── ProviderManager.ts        # 供应商业务逻辑（已有）
├── utils/                         # 工具函数
│   ├── env-config.ts             # 环境配置（已有）
│   └── version.ts                # 版本工具（已有）
├── i18n/                          # 国际化
├── commands/                      # 命令模块
├── types/                         # 类型定义
└── cli.ts                         # CLI 入口（已有）
```

### 现有工具和模式

1. **配置管理模式**: `CCMConfigManager` 和 `ClaudeConfigManager`
2. **业务逻辑模式**: `ProviderManager`
3. **CLI 命令模式**: commander.js + inquirer
4. **已有依赖**: fs-extra, chalk, inquirer, commander

## 集成方案设计

### 1. 新增模块结构

```
src/
├── core/
│   ├── CCMConfigManager.ts       # 已有
│   ├── ClaudeConfigManager.ts    # 已有
│   └── EnvironmentManager.ts     # 【新增】环境检查和管理
├── setup/                         # 【新增】安装模块
│   ├── types.ts                  # Setup 相关类型定义
│   ├── checker.ts                # 环境检查器
│   ├── installer.ts              # 安装执行器
│   └── strategies/               # 安装策略
│       ├── volta.ts
│       ├── nvm.ts
│       └── node.ts
├── utils/
│   ├── env-config.ts             # 已有
│   ├── version.ts                # 已有
│   └── command.ts                # 【新增】命令执行工具
└── cli.ts                         # 已有，需扩展
```

### 2. 核心类设计

#### EnvironmentManager (src/core/EnvironmentManager.ts)

```typescript
import { ClaudeConfigManager } from './ClaudeConfigManager';
import { EnvironmentChecker } from '../setup/checker';
import { Installer } from '../setup/installer';

/**
 * 环境管理器 - 负责检查和配置 Claude Code 运行环境
 */
export class EnvironmentManager {
  private checker: EnvironmentChecker;
  private installer: Installer;
  private claudeConfig: ClaudeConfigManager;

  constructor(claudeConfigPath?: string) {
    this.checker = new EnvironmentChecker();
    this.installer = new Installer();
    this.claudeConfig = new ClaudeConfigManager(claudeConfigPath);
  }

  /**
   * 检查环境状态
   */
  async checkEnvironment(): Promise<EnvironmentCheckResult> {
    return await this.checker.check();
  }

  /**
   * 自动配置环境
   */
  async setupEnvironment(options?: SetupOptions): Promise<SetupResult> {
    const checkResult = await this.checkEnvironment();

    if (checkResult.status === 'ready') {
      return { success: true, message: 'Environment is ready' };
    }

    return await this.installer.install(checkResult, options);
  }

  /**
   * 验证 Claude Code 可用性
   */
  async verifyClaudeCode(): Promise<boolean> {
    const checkResult = await this.checkEnvironment();
    return checkResult.claudeCode.installed && checkResult.node.versionValid;
  }
}
```

### 3. CLI 集成点

#### 3.1 在 `ProviderManager.init()` 中集成检查

```typescript
// src/providers/ProviderManager.ts
async init(): Promise<void> {
  await this.ccmConfig.init();

  const config = await this.ccmConfig.readConfig();
  this.claudeConfig = new ClaudeConfigManager(config.claudeConfigPath);

  await this.claudeConfig.ensureClaudeConfigDir();

  // 【新增】检查 Claude Code 环境
  // 注意：仅检查，不自动安装，避免干扰用户
  const envManager = new EnvironmentManager(config.claudeConfigPath);
  const isReady = await envManager.verifyClaudeCode();

  if (!isReady) {
    console.log(chalk.yellow('⚠️  Claude Code environment may need setup.'));
    console.log(chalk.cyan('   Run "ccman setup" or "ccman doctor" for details.'));
  }
}
```

#### 3.2 新增 `setup` 命令

```typescript
// src/cli.ts
program
  .command('setup')
  .description('Check and setup Claude Code environment')
  .option('--check-only', 'Only check environment, do not install')
  .option('--auto', 'Automatically install without prompts')
  .action(async (options) => {
    const envManager = new EnvironmentManager();

    // 检查环境
    const checkResult = await envManager.checkEnvironment();

    // 显示检查结果
    displayCheckResult(checkResult);

    if (options.checkOnly || checkResult.status === 'ready') {
      return;
    }

    // 交互式或自动安装
    if (options.auto) {
      await envManager.setupEnvironment({ auto: true });
    } else {
      await interactiveSetup(envManager, checkResult);
    }
  });
```

#### 3.3 新增 `doctor` 命令（诊断）

```typescript
// src/cli.ts
program
  .command('doctor')
  .description('Diagnose Claude Code environment')
  .action(async () => {
    const envManager = new EnvironmentManager();
    const checkResult = await envManager.checkEnvironment();

    // 详细诊断输出
    displayDetailedDiagnostics(checkResult);
  });
```

### 4. 复用现有模式

#### 4.1 使用已有的 `fs-extra`

```typescript
// 所有文件操作使用 fs-extra（已安装）
import * as fs from 'fs-extra';

// 已在 ClaudeConfigManager 中使用
await fs.ensureDir(path.dirname(this.claudeConfigPath));
```

#### 4.2 使用已有的 `inquirer`

```typescript
// 交互式选择（已在 cli.ts 中大量使用）
import inquirer from 'inquirer';

const { choice } = await inquirer.prompt([
  {
    type: 'list',
    name: 'choice',
    message: '选择 Node.js 安装方式:',
    choices: [
      { name: '推荐: 通过 Volta 安装', value: 'volta' },
      { name: '备选: 通过 nvm 安装', value: 'nvm' },
      { name: '直接安装 Node.js', value: 'direct' }
    ]
  }
]);
```

#### 4.3 使用已有的 `chalk`

```typescript
// 彩色输出（已在 cli.ts 中大量使用）
import chalk from 'chalk';

console.log(chalk.green('✓ Node.js 已安装'));
console.log(chalk.yellow('⚠️  版本过低'));
console.log(chalk.red('✗ Claude Code 未安装'));
```

### 5. 类型定义复用和扩展

```typescript
// src/types/index.ts（已有，需扩展）
export interface OperationResult {
  success: boolean;
  message: string;
  data?: any;
}

// src/setup/types.ts（新增）
import { OperationResult } from '../types';

export interface EnvironmentCheckResult {
  status: 'ready' | 'needs-setup' | 'error';
  claudeCode: ToolInfo;
  node: NodeInfo;
  npm: ToolInfo;
  // ...
}

export interface SetupResult extends OperationResult {
  steps?: StepResult[];
}
```

### 6. 工具函数设计

#### 6.1 命令执行工具（复用模式）

```typescript
// src/utils/command.ts（新增）
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 执行命令（与现有代码模式一致）
 */
export async function executeCommand(
  cmd: string,
  options?: { timeout?: number }
): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: options?.timeout || 30000
    });
    return { stdout: stdout.trim(), stderr: stderr.trim(), code: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      code: error.code || 1
    };
  }
}

/**
 * 检查命令是否存在
 */
export async function commandExists(cmd: string): Promise<boolean> {
  const checkCmd = process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`;
  const result = await executeCommand(checkCmd);
  return result.code === 0;
}
```

### 7. 渐进式实现计划

#### Phase 1: 基础检查能力
- [x] 创建 `EnvironmentManager` 类
- [ ] 实现基础的环境检查（Claude Code, Node.js）
- [ ] 添加 `doctor` 命令展示诊断结果
- [ ] 不涉及安装，仅检查和提示

#### Phase 2: 交互式安装
- [ ] 实现安装策略（volta, nvm, node）
- [ ] 添加 `setup` 命令交互式流程
- [ ] 集成到 `ProviderManager.init()`

#### Phase 3: 自动化和优化
- [ ] 支持 `--auto` 自动安装
- [ ] 支持多平台（macOS, Linux, Windows）
- [ ] 错误处理和回退机制

### 8. 避免的问题

1. **不破坏现有功能**: Setup 功能是可选的，不影响现有的配置管理
2. **不强制检查**: 仅在需要时提示，不阻塞用户操作
3. **复用现有依赖**: 不引入新的依赖包
4. **遵循现有模式**: 保持代码风格和架构一致性

### 9. 测试策略

```typescript
// 手动测试流程
ccman doctor          // 测试诊断功能
ccman setup --check-only  // 测试仅检查
ccman setup          // 测试交互式安装
ccman                // 测试现有功能不受影响
ccman use <id>       // 测试配置切换前的检查
```

## 下一步行动

1. 创建 `src/utils/command.ts` - 命令执行工具
2. 创建 `src/setup/types.ts` - Setup 类型定义
3. 创建 `src/setup/checker.ts` - 环境检查器
4. 创建 `src/core/EnvironmentManager.ts` - 环境管理器
5. 在 `src/cli.ts` 中添加 `doctor` 和 `setup` 命令
6. 测试验证