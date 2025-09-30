# CCM 环境检查和安装实现逻辑

## 核心原则

1. **最小化安装** - 只安装真正需要的软件
2. **避免重复** - 不安装功能重复的软件
3. **官方脚本优先** - 不依赖额外的包管理器（brew/choco/scoop）
4. **充分利用现有环境** - 有什么用什么
5. **总是验证版本** - 即使软件已安装也要检查版本匹配

## 必需 vs 可选软件清单

### 必需软件
- ✅ **Claude Code** - 核心工具
- ✅ **Node.js** - 运行时环境（版本需从官方文档确认）
- ✅ **npm** - 包管理器（随 Node.js 自动安装）

### 可选软件（按需安装）
- 🔶 **volta** 或 **nvm** - Node.js 版本管理器（二选一，或都不装）
  - 仅在 Node.js 未安装时才建议安装
  - 如果 Node.js 已安装且版本合适，则不需要
  - 如果已有其中一个，不安装另一个

### 不需要安装
- ❌ **Homebrew** - 不作为前置依赖
- ❌ **yarn/pnpm** - 非必需的包管理器
- ❌ **Chocolatey/Scoop** - 不作为前置依赖

## 完整实现流程

### 阶段 0: 准备阶段

```typescript
// 0.1 获取 Claude Code 官方依赖要求
async function getClaudeCodeRequirements() {
  // TODO: 从官方文档或 API 获取
  // 临时假设（需要确认）
  return {
    nodeVersion: '>=18.0.0',  // 需要从官方文档确认
    requiredTools: ['node', 'npm']
  };
}
```

### 阶段 1: 环境检查（总是执行）

```typescript
async function checkEnvironment() {
  const requirements = await getClaudeCodeRequirements();

  // 1.1 检查 Claude Code
  const claudeCode = {
    installed: await commandExists('claude'),
    version: await getVersion('claude --version')
  };

  // 1.2 检查 Node.js（总是检查，即使 Claude Code 已安装）
  const node = {
    installed: await commandExists('node'),
    version: await getVersion('node --version'),
    versionValid: false
  };

  if (node.installed) {
    node.versionValid = satisfiesVersion(node.version, requirements.nodeVersion);
  }

  // 1.3 检查 npm（随 Node.js 自带）
  const npm = {
    installed: await commandExists('npm'),
    version: await getVersion('npm --version')
  };

  // 1.4 检查版本管理器（仅检测，不强制要求）
  const versionManagers = {
    volta: await commandExists('volta'),
    nvm: await commandExists('nvm')
  };

  return {
    claudeCode,
    node,
    npm,
    versionManagers,
    requirements
  };
}
```

**检查结果分析**:

| Claude Code | Node.js | Node 版本 | 下一步 |
|------------|---------|----------|--------|
| ✅ 已安装 | ✅ 已安装 | ✅ 合适 | **完成** - 环境就绪 |
| ✅ 已安装 | ✅ 已安装 | ❌ 过低 | **警告** - 需要升级 Node.js |
| ✅ 已安装 | ❌ 未安装 | - | **错误** - Node.js 缺失（异常状态） |
| ❌ 未安装 | ✅ 已安装 | ✅ 合适 | 跳到阶段 3 - 仅安装 Claude Code |
| ❌ 未安装 | ✅ 已安装 | ❌ 过低 | 进入阶段 2 - 升级 Node.js |
| ❌ 未安装 | ❌ 未安装 | - | 进入阶段 2 - 安装 Node.js |

### 阶段 2: Node.js 安装/升级决策

```typescript
async function planNodeJsInstallation(checkResult) {
  const { node, versionManagers } = checkResult;

  // 场景 1: Node.js 已安装且版本合适 - 无需操作
  if (node.installed && node.versionValid) {
    return { action: 'skip', reason: 'Node.js 版本已满足要求' };
  }

  // 场景 2: Node.js 已安装但版本过低 - 需要升级
  if (node.installed && !node.versionValid) {

    // 2.1 如果已有版本管理器，使用它升级
    if (versionManagers.volta) {
      return {
        action: 'upgrade',
        method: 'volta',
        steps: [
          { cmd: 'volta install node@20', desc: '使用 Volta 安装最新 LTS 版本' }
        ]
      };
    }

    if (versionManagers.nvm) {
      return {
        action: 'upgrade',
        method: 'nvm',
        steps: [
          { cmd: 'nvm install 20', desc: '安装 Node.js 20' },
          { cmd: 'nvm use 20', desc: '切换到 Node.js 20' },
          { cmd: 'nvm alias default 20', desc: '设置为默认版本' }
        ]
      };
    }

    // 2.2 没有版本管理器，提示手动升级或安装版本管理器
    return {
      action: 'upgrade',
      method: 'manual',
      warning: 'Node.js 版本过低，建议：',
      options: [
        {
          name: '选项 1: 手动升级 Node.js（访问 nodejs.org）',
          priority: 1,
          manual: true
        },
        {
          name: '选项 2: 安装 Volta 管理 Node.js 版本',
          priority: 2,
          steps: await getVoltaInstallSteps()
        },
        {
          name: '选项 3: 安装 nvm 管理 Node.js 版本',
          priority: 3,
          steps: await getNvmInstallSteps()
        }
      ]
    };
  }

  // 场景 3: Node.js 未安装 - 推荐使用版本管理器
  if (!node.installed) {

    // 3.1 如果已有版本管理器，直接使用
    if (versionManagers.volta) {
      return {
        action: 'install',
        method: 'volta',
        reason: '检测到已安装 Volta',
        steps: [
          { cmd: 'volta install node@20', desc: '安装 Node.js 20 LTS' }
        ]
      };
    }

    if (versionManagers.nvm) {
      return {
        action: 'install',
        method: 'nvm',
        reason: '检测到已安装 nvm',
        steps: [
          { cmd: 'nvm install 20', desc: '安装 Node.js 20' },
          { cmd: 'nvm use 20', desc: '切换到 Node.js 20' },
          { cmd: 'nvm alias default 20', desc: '设置为默认版本' }
        ]
      };
    }

    // 3.2 没有版本管理器，推荐安装（但不强制）
    return {
      action: 'install',
      method: 'choose',
      message: 'Node.js 未安装，请选择安装方式：',
      options: [
        {
          name: '推荐: 通过 Volta 安装（简单，自动版本管理）',
          priority: 1,
          steps: [
            ...await getVoltaInstallSteps(),
            { cmd: 'volta install node@20', desc: '安装 Node.js 20' }
          ]
        },
        {
          name: '备选: 通过 nvm 安装（灵活，手动切换版本）',
          priority: 2,
          steps: [
            ...await getNvmInstallSteps(),
            { cmd: 'nvm install 20 && nvm use 20 && nvm alias default 20', desc: '安装并设置 Node.js 20' }
          ]
        },
        {
          name: '直接安装 Node.js（无版本管理）',
          priority: 3,
          steps: await getDirectNodeInstallSteps()
        }
      ]
    };
  }
}
```

### 阶段 2.1: Volta 安装步骤（官方脚本优先）

```typescript
async function getVoltaInstallSteps() {
  const platform = process.platform;

  // macOS / Linux - 官方脚本（优先）
  if (platform === 'darwin' || platform === 'linux') {
    const hasBrewOptional = await commandExists('brew');

    return {
      method: 'official-script',
      priority: 1,
      steps: [
        {
          cmd: 'curl https://get.volta.sh | bash',
          desc: '使用官方脚本安装 Volta'
        },
        {
          cmd: 'source ~/.bashrc  # 或 source ~/.zshrc',
          desc: '重新加载 shell 配置'
        }
      ],
      alternatives: hasBrewOptional ? [
        {
          name: '备选: 使用 Homebrew（如果你更喜欢）',
          steps: [
            { cmd: 'brew install volta', desc: '通过 Homebrew 安装' }
          ]
        }
      ] : []
    };
  }

  // Windows - 官方安装器（优先）
  if (platform === 'win32') {
    const hasChocoOptional = await commandExists('choco');
    const hasScoopOptional = await commandExists('scoop');

    const alternatives = [];
    if (hasChocoOptional) {
      alternatives.push({
        name: '备选: 使用 Chocolatey',
        steps: [{ cmd: 'choco install volta', desc: '通过 Chocolatey 安装' }]
      });
    }
    if (hasScoopOptional) {
      alternatives.push({
        name: '备选: 使用 Scoop',
        steps: [{ cmd: 'scoop install volta', desc: '通过 Scoop 安装' }]
      });
    }

    return {
      method: 'official-installer',
      priority: 1,
      steps: [
        {
          cmd: 'manual',
          desc: '访问 https://github.com/volta-cli/volta/releases',
          manual: true
        },
        {
          cmd: 'manual',
          desc: '下载并运行 volta-x.x.x-windows-x86_64.msi',
          manual: true
        }
      ],
      alternatives
    };
  }
}
```

### 阶段 2.2: nvm 安装步骤（官方脚本优先）

```typescript
async function getNvmInstallSteps() {
  const platform = process.platform;

  // macOS / Linux - 官方脚本（优先）
  if (platform === 'darwin' || platform === 'linux') {
    const hasBrewOptional = await commandExists('brew');

    return {
      method: 'official-script',
      priority: 1,
      steps: [
        {
          cmd: 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash',
          desc: '使用官方脚本安装 nvm'
        },
        {
          cmd: 'source ~/.bashrc  # 或 source ~/.zshrc',
          desc: '重新加载 shell 配置'
        }
      ],
      alternatives: hasBrewOptional ? [
        {
          name: '备选: 使用 Homebrew（需要额外配置）',
          steps: [
            { cmd: 'brew install nvm', desc: '通过 Homebrew 安装' },
            { cmd: 'mkdir ~/.nvm', desc: '创建 nvm 目录' },
            { cmd: 'manual', desc: '需要手动配置环境变量（见 brew info nvm）', manual: true }
          ]
        }
      ] : []
    };
  }

  // Windows - nvm-windows（不同项目）
  if (platform === 'win32') {
    const hasChocoOptional = await commandExists('choco');

    return {
      method: 'nvm-windows',
      priority: 1,
      steps: [
        {
          cmd: 'manual',
          desc: '访问 https://github.com/coreybutler/nvm-windows/releases',
          manual: true
        },
        {
          cmd: 'manual',
          desc: '下载并运行 nvm-setup.exe',
          manual: true
        }
      ],
      alternatives: hasChocoOptional ? [
        {
          name: '备选: 使用 Chocolatey',
          steps: [
            { cmd: 'choco install nvm', desc: '通过 Chocolatey 安装' }
          ]
        }
      ] : []
    };
  }
}
```

### 阶段 2.3: 直接安装 Node.js（无版本管理器）

```typescript
async function getDirectNodeInstallSteps() {
  const platform = process.platform;

  if (platform === 'darwin') {
    const hasBrew = await commandExists('brew');

    return {
      method: 'official-installer',
      priority: 1,
      steps: [
        {
          cmd: 'manual',
          desc: '访问 https://nodejs.org/',
          manual: true
        },
        {
          cmd: 'manual',
          desc: '下载并安装 LTS 版本 .pkg 文件',
          manual: true
        }
      ],
      alternatives: hasBrew ? [
        {
          name: '备选: 使用 Homebrew',
          steps: [
            { cmd: 'brew install node@20', desc: '安装 Node.js 20 LTS' }
          ]
        }
      ] : []
    };
  }

  if (platform === 'linux') {
    const distro = await detectLinuxDistro();

    // Ubuntu/Debian
    if (distro === 'ubuntu' || distro === 'debian') {
      return {
        method: 'nodesource',
        priority: 1,
        steps: [
          {
            cmd: 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -',
            desc: '添加 NodeSource 仓库'
          },
          {
            cmd: 'sudo apt-get install -y nodejs',
            desc: '安装 Node.js'
          }
        ]
      };
    }

    // CentOS/RHEL/Fedora
    if (distro === 'centos' || distro === 'fedora') {
      return {
        method: 'nodesource',
        priority: 1,
        steps: [
          {
            cmd: 'curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -',
            desc: '添加 NodeSource 仓库'
          },
          {
            cmd: 'sudo yum install -y nodejs',
            desc: '安装 Node.js'
          }
        ]
      };
    }

    // 其他发行版
    return {
      method: 'package-manager',
      steps: [
        {
          cmd: 'manual',
          desc: '使用系统包管理器安装 Node.js（版本可能较旧）',
          manual: true
        }
      ]
    };
  }

  if (platform === 'win32') {
    const hasChoco = await commandExists('choco');

    return {
      method: 'official-installer',
      priority: 1,
      steps: [
        {
          cmd: 'manual',
          desc: '访问 https://nodejs.org/',
          manual: true
        },
        {
          cmd: 'manual',
          desc: '下载并安装 LTS 版本 .msi 文件',
          manual: true
        }
      ],
      alternatives: hasChoco ? [
        {
          name: '备选: 使用 Chocolatey',
          steps: [
            { cmd: 'choco install nodejs-lts', desc: '安装 Node.js LTS' }
          ]
        }
      ] : []
    };
  }
}
```

### 阶段 3: 安装 Claude Code

```typescript
async function installClaudeCode(checkResult) {
  const { npm } = checkResult;

  // 3.1 确认 npm 可用
  if (!npm.installed) {
    return {
      error: true,
      message: 'npm 未找到，请确保 Node.js 安装正确'
    };
  }

  // 3.2 安装 Claude Code
  // TODO: 确认正确的包名和安装命令
  return {
    action: 'install',
    steps: [
      {
        // 假设的命令，需要从官方文档确认
        cmd: 'npm install -g @anthropic-ai/claude-code',
        desc: '全局安装 Claude Code CLI'
      }
    ]
  };
}
```

### 阶段 4: 最终验证

```typescript
async function verifyInstallation(requirements) {
  const checks = {
    node: {
      installed: false,
      version: null,
      valid: false
    },
    npm: {
      installed: false,
      version: null
    },
    claudeCode: {
      installed: false,
      version: null
    }
  };

  // 4.1 验证 Node.js
  if (await commandExists('node')) {
    checks.node.installed = true;
    checks.node.version = await getVersion('node --version');
    checks.node.valid = satisfiesVersion(
      checks.node.version,
      requirements.nodeVersion
    );
  }

  // 4.2 验证 npm
  if (await commandExists('npm')) {
    checks.npm.installed = true;
    checks.npm.version = await getVersion('npm --version');
  }

  // 4.3 验证 Claude Code
  if (await commandExists('claude')) {
    checks.claudeCode.installed = true;
    checks.claudeCode.version = await getVersion('claude --version');
  }

  // 4.4 判断是否全部通过
  const allPassed =
    checks.node.installed &&
    checks.node.valid &&
    checks.npm.installed &&
    checks.claudeCode.installed;

  return {
    success: allPassed,
    checks,
    message: allPassed
      ? '✅ 环境配置完成，所有检查通过'
      : '❌ 部分检查未通过，请查看详情'
  };
}
```

## 完整流程示例

### 示例 1: 全新环境（macOS，无任何工具）

```
1. 检查环境
   ❌ Claude Code: 未安装
   ❌ Node.js: 未安装
   ❌ volta: 未安装
   ❌ nvm: 未安装

2. 用户选择安装方式
   → 选择: 通过 Volta 安装（推荐）

3. 执行安装
   Step 1: curl https://get.volta.sh | bash
   Step 2: source ~/.zshrc
   Step 3: volta install node@20
   Step 4: npm install -g @anthropic-ai/claude-code

4. 验证
   ✅ Node.js 20.x.x - 版本满足要求
   ✅ npm 10.x.x - 已安装
   ✅ Claude Code 1.x.x - 已安装

✅ 安装完成
```

### 示例 2: Node.js 已安装但版本过低

```
1. 检查环境
   ❌ Claude Code: 未安装
   ⚠️  Node.js: v16.20.0（版本过低，需要 >= 18.0.0）
   ❌ volta: 未安装
   ❌ nvm: 未安装

2. 提示用户
   Node.js 版本不满足要求，请选择：
   → 选项 1: 手动升级（访问 nodejs.org）
   → 选项 2: 安装 Volta 管理版本（推荐）
   → 选项 3: 安装 nvm 管理版本

3. 用户选择: 安装 Volta

4. 执行安装
   Step 1: curl https://get.volta.sh | bash
   Step 2: volta install node@20
   Step 3: npm install -g @anthropic-ai/claude-code

5. 验证
   ✅ Node.js 20.x.x（通过 Volta 管理）
   ⚠️  旧版本 Node.js v16 仍然存在（被 Volta 覆盖）
   ✅ npm 10.x.x
   ✅ Claude Code 1.x.x

✅ 安装完成
💡 提示: Volta 已接管 Node.js 版本管理
```

### 示例 3: Node.js 和 volta 已安装，版本合适

```
1. 检查环境
   ❌ Claude Code: 未安装
   ✅ Node.js: v20.11.0（版本满足）
   ✅ volta: 已安装

2. 跳过 Node.js 安装

3. 执行安装
   Step 1: npm install -g @anthropic-ai/claude-code

4. 验证
   ✅ Node.js 20.11.0 - 版本满足
   ✅ npm 10.2.4 - 已安装
   ✅ Claude Code 1.x.x - 已安装

✅ 安装完成
```

### 示例 4: 所有工具都已安装

```
1. 检查环境
   ✅ Claude Code: 1.0.0
   ✅ Node.js: v20.11.0（版本满足）
   ✅ nvm: 已安装

2. 验证版本兼容性
   ✅ Node.js 版本满足 Claude Code 要求

✅ 环境已就绪，无需配置
```

## 决策树总结

```
开始
  ↓
检查 Claude Code
  ├─ 已安装 → 检查 Node.js 版本
  │            ├─ 版本合适 → ✅ 完成
  │            └─ 版本过低 → ⚠️ 警告 + 升级建议
  │
  └─ 未安装 → 检查 Node.js
               ├─ 已安装 + 版本合适 → 直接安装 Claude Code
               ├─ 已安装 + 版本过低 → 升级 Node.js → 安装 Claude Code
               └─ 未安装 → 检查版本管理器
                            ├─ volta 已安装 → 用 volta 装 Node → 安装 Claude Code
                            ├─ nvm 已安装 → 用 nvm 装 Node → 安装 Claude Code
                            └─ 都未安装 → 用户选择
                                          ├─ 安装 volta → 装 Node → 安装 Claude Code
                                          ├─ 安装 nvm → 装 Node → 安装 Claude Code
                                          └─ 直接安装 Node → 安装 Claude Code
```

## 关键实现要点

### 1. 命令存在性检查（跨平台）

```typescript
async function commandExists(command: string): Promise<boolean> {
  const checkCmd = process.platform === 'win32'
    ? `where ${command}`
    : `command -v ${command}`;

  try {
    await execPromise(checkCmd);
    return true;
  } catch {
    return false;
  }
}
```

### 2. 版本比较

```typescript
import semver from 'semver';

function satisfiesVersion(current: string, required: string): boolean {
  // 清理版本号格式 (v20.11.0 → 20.11.0)
  const cleaned = current.replace(/^v/, '');
  return semver.satisfies(cleaned, required);
}
```

### 3. 用户确认（交互模式）

```typescript
import inquirer from 'inquirer';

async function confirmInstall(plan) {
  console.log('\n📋 安装计划:');
  plan.steps.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step.desc}`);
    console.log(`     $ ${step.cmd}`);
  });

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: '是否继续执行？',
      default: true
    }
  ]);

  return confirmed;
}
```

### 4. 获取 Claude Code 官方要求（需要实现）

```typescript
// 方法 1: 从官方 API 获取
async function getRequirementsFromAPI() {
  try {
    const response = await fetch('https://api.anthropic.com/v1/claude-code/requirements');
    return await response.json();
  } catch {
    return null;
  }
}

// 方法 2: 从官方文档解析
async function getRequirementsFromDocs() {
  // 使用 WebFetch 工具获取官方文档
  // 解析 Node.js 版本要求
}

// 方法 3: 硬编码（备选，需要定期更新）
function getRequirementsFallback() {
  return {
    nodeVersion: '>=18.0.0',  // 需要确认
    requiredTools: ['node', 'npm']
  };
}
```

## TODO: 需要确认的信息

1. ⚠️ **Claude Code 的正确安装方式**
   - npm 包名是什么？
   - 是否有官方安装脚本？
   - 是否支持其他安装方式？

2. ⚠️ **Claude Code 的依赖要求**
   - Node.js 最低版本？
   - npm 最低版本？
   - 是否有其他系统依赖？

3. ⚠️ **官方文档位置**
   - 安装文档 URL
   - 系统要求文档 URL
   - 是否有 API 可以查询依赖要求？