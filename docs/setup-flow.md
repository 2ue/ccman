# CCM 环境检查和安装逻辑流程

## 1. 主流程图

```mermaid
flowchart TD
    Start([用户执行 ccman setup]) --> CheckClaude{检查 Claude Code<br/>是否已安装?}

    CheckClaude -->|已安装| Success([✅ 环境就绪<br/>显示版本信息])
    CheckClaude -->|未安装| CheckNode{检查 Node.js<br/>是否已安装?}

    CheckNode -->|已安装| CheckNodeVersion{Node.js 版本<br/>是否满足要求?}
    CheckNode -->|未安装| NodeInstallPlan[生成 Node.js<br/>安装计划]

    CheckNodeVersion -->|满足| InstallClaude[安装 Claude Code]
    CheckNodeVersion -->|不满足| NodeUpgradePlan[生成 Node.js<br/>升级计划]

    NodeInstallPlan --> ExecuteNodeInstall[执行 Node.js 安装]
    NodeUpgradePlan --> ExecuteNodeInstall

    ExecuteNodeInstall --> VerifyNode{验证 Node.js<br/>安装成功?}
    VerifyNode -->|失败| ShowError([❌ 显示错误和建议])
    VerifyNode -->|成功| InstallClaude

    InstallClaude --> VerifyClaude{验证 Claude Code<br/>安装成功?}
    VerifyClaude -->|成功| Success
    VerifyClaude -->|失败| ShowError

    Success --> End([结束])
    ShowError --> End
```

## 2. Node.js 安装决策树

```mermaid
flowchart TD
    Start([需要安装 Node.js]) --> CheckVM{检查版本管理器<br/>是否已安装?}

    CheckVM -->|Volta 已安装| UseVolta[使用 Volta 安装 Node]
    CheckVM -->|nvm 已安装| UseNvm[使用 nvm 安装 Node]
    CheckVM -->|都未安装| AskUser{询问用户选择<br/>安装方式}

    AskUser --> OptionVolta[推荐: 安装 Volta]
    AskUser --> OptionNvm[备选: 安装 nvm]
    AskUser --> OptionDirect[直接安装 Node.js]

    OptionVolta --> PlatformVolta{检测操作系统}
    OptionNvm --> PlatformNvm{检测操作系统}
    OptionDirect --> PlatformNode{检测操作系统}

    PlatformVolta -->|macOS| MacVolta[检查 Homebrew]
    PlatformVolta -->|Linux| LinuxVolta[使用官方脚本]
    PlatformVolta -->|Windows| WinVolta[Chocolatey/Scoop/官方.msi]

    MacVolta -->|Brew 已安装| VoltaBrew[brew install volta]
    MacVolta -->|Brew 未安装| VoltaScript[curl get.volta.sh]

    VoltaBrew --> UseVolta
    VoltaScript --> UseVolta
    LinuxVolta --> UseVolta
    WinVolta --> UseVolta

    UseVolta --> InstallNode[volta install node@20]
    UseNvm --> InstallNode[nvm install 20<br/>nvm use 20]
    OptionDirect --> DirectInstall[平台特定<br/>直接安装命令]

    InstallNode --> Verify([验证安装])
    DirectInstall --> Verify
```

## 3. 依赖关系图

```mermaid
graph TD
    subgraph "Claude Code 依赖层级"
        CC[Claude Code] --> Node[Node.js >= 18.0]
        Node --> PM[包管理器<br/>npm/pnpm/yarn]
        Node -.可选.-> VM[版本管理器<br/>Volta/nvm]
        VM -.依赖于.-> PT[平台工具]
        PT -.macOS.-> Brew[Homebrew]
        PT -.Linux.-> APT[apt/yum/dnf]
        PT -.Windows.-> Choco[Chocolatey/Scoop]
    end

    style CC fill:#f9f,stroke:#333,stroke-width:3px
    style Node fill:#bbf,stroke:#333,stroke-width:2px
    style VM fill:#bfb,stroke:#333,stroke-width:1px
    style PT fill:#fbb,stroke:#333,stroke-width:1px
```

## 4. 检查顺序流程

```mermaid
sequenceDiagram
    participant User
    participant Setup as SetupManager
    participant Check as Checker
    participant Plan as Planner
    participant Install as Installer

    User->>Setup: ccman setup

    Setup->>Check: 1. checkClaudeCode()
    Check-->>Setup: installed: false

    Setup->>Check: 2. checkNodeVersion()
    Check-->>Setup: version: null (未安装)

    Setup->>Check: 3. checkVersionManager()
    Check-->>Setup: volta: false, nvm: false

    Setup->>Check: 4. checkPackageManager()
    Check-->>Setup: available: []

    Setup->>Check: 5. checkPlatformTools()
    Check-->>Setup: brew: true (macOS)

    Setup->>Plan: generateInstallPlan(checkResult)
    Plan-->>Setup: installPlan

    Setup->>User: 显示安装计划
    User->>Setup: 确认安装

    Setup->>Install: 执行步骤1: 安装 Volta
    Install-->>Setup: 成功

    Setup->>Install: 执行步骤2: 安装 Node.js
    Install-->>Setup: 成功

    Setup->>Install: 执行步骤3: 安装 Claude Code
    Install-->>Setup: 成功

    Setup->>Check: 最终验证
    Check-->>Setup: 全部通过

    Setup->>User: ✅ 安装完成
```

## 5. 并行检查 vs 串行执行

### 并行检查阶段（可同时进行）
```typescript
// 这些检查互不依赖，可以并行执行
const [
  claudeCodeInstalled,
  nodeInfo,
  vmInfo,
  pmInfo,
  platformInfo
] = await Promise.all([
  checkClaudeCode(),      // 检查1
  checkNodeVersion(),     // 检查2
  checkVersionManager(),  // 检查3
  checkPackageManager(),  // 检查4
  checkPlatformTools()    // 检查5
]);
```

### 串行执行阶段（必须按顺序）
```typescript
// 安装必须按依赖顺序执行
// Step 1: 安装版本管理器（如果需要）
if (needVersionManager) {
  await installVersionManager(); // Volta 或 nvm
  // ⚠️ 必须等待完成才能继续
}

// Step 2: 安装 Node.js（依赖于 Step 1）
await installNode();
// ⚠️ 必须等待完成才能继续

// Step 3: 安装 Claude Code（依赖于 Step 2）
await installClaudeCode();
```

## 6. 前置条件判断矩阵

| 安装目标 | 前置条件 | 可选优化 | 平台工具依赖 |
|---------|---------|---------|------------|
| **Volta** | 无 | Homebrew (macOS) | brew/choco/scoop |
| **nvm** | 无 | Homebrew (macOS) | brew (可选) |
| **Node.js (via Volta)** | ✅ Volta | - | - |
| **Node.js (via nvm)** | ✅ nvm | - | - |
| **Node.js (直接)** | 无 | Homebrew/apt/choco | brew/apt/yum/choco |
| **Claude Code** | ✅ Node.js >= 18<br/>✅ npm/pnpm/yarn | - | - |

## 7. 决策逻辑伪代码

```typescript
async function setupEnvironment() {
  // === 阶段1: 并行检查（无依赖关系） ===
  const envCheck = await parallelCheck();

  // 早期退出条件
  if (envCheck.claudeCodeInstalled) {
    return success('Claude Code 已安装');
  }

  // === 阶段2: 生成安装计划（基于检查结果） ===
  const plan = {
    steps: []
  };

  // 决策1: 是否需要安装 Node.js？
  if (!envCheck.nodeInstalled || !envCheck.nodeVersionValid) {

    // 决策2: 选择 Node.js 安装方式
    if (envCheck.voltaInstalled) {
      plan.steps.push({ action: 'installNodeViaVolta' });
    }
    else if (envCheck.nvmInstalled) {
      plan.steps.push({ action: 'installNodeViaNvm' });
    }
    else {
      // 决策3: 推荐安装版本管理器
      const choice = await askUser([
        { name: '推荐: 安装 Volta + Node.js', value: 'volta' },
        { name: '备选: 安装 nvm + Node.js', value: 'nvm' },
        { name: '直接安装 Node.js', value: 'direct' }
      ]);

      if (choice === 'volta') {
        // 决策4: 选择 Volta 安装方式（平台相关）
        if (envCheck.platform === 'darwin' && envCheck.brewInstalled) {
          plan.steps.push({ action: 'installVoltaViaBrew' });
        } else {
          plan.steps.push({ action: 'installVoltaViaScript' });
        }
        plan.steps.push({ action: 'installNodeViaVolta' });
      }
      else if (choice === 'nvm') {
        plan.steps.push({ action: 'installNvm' });
        plan.steps.push({ action: 'installNodeViaNvm' });
      }
      else {
        plan.steps.push({ action: 'installNodeDirect' });
      }
    }
  }

  // 最后一步: 安装 Claude Code（依赖 Node.js）
  plan.steps.push({ action: 'installClaudeCode' });

  // === 阶段3: 串行执行安装计划 ===
  for (const step of plan.steps) {
    const result = await executeStep(step);

    if (!result.success) {
      // 失败处理: 尝试备选方案或退出
      if (step.alternatives) {
        await tryAlternatives(step.alternatives);
      } else {
        return error('安装失败', step);
      }
    }
  }

  // === 阶段4: 最终验证 ===
  const finalCheck = await verifyInstallation();
  return finalCheck.success ? success() : error();
}
```

## 8. 关键依赖关系

```
前置依赖（必须先满足）:
├─ Claude Code
│  └─ 必须: Node.js >= 18.0
│     └─ 必须: npm/pnpm/yarn (通常随 Node 自动安装)
│
├─ Node.js (via Volta)
│  └─ 必须: Volta
│     └─ 可选: Homebrew (macOS, 简化安装)
│
├─ Node.js (via nvm)
│  └─ 必须: nvm
│     └─ 可选: Homebrew (macOS, 简化安装)
│
└─ Node.js (直接安装)
   └─ 可选: Homebrew/apt/yum/choco (简化安装)

优化依赖（非必需，但推荐）:
├─ macOS
│  └─ Homebrew → 简化所有软件安装
├─ Linux
│  └─ apt/yum/dnf → 系统包管理器
└─ Windows
   └─ Chocolatey/Scoop → 简化软件安装
```

## 9. 状态转换图

```mermaid
stateDiagram-v2
    [*] --> Checking: 开始检查

    Checking --> Ready: Claude Code 已安装
    Checking --> NodeMissing: Node.js 未安装
    Checking --> NodeOutdated: Node.js 版本过低
    Checking --> NodeReady: Node.js 已就绪

    NodeMissing --> PlanningNode: 规划 Node.js 安装
    NodeOutdated --> PlanningNode: 规划 Node.js 升级

    PlanningNode --> InstallingVM: 选择安装版本管理器
    PlanningNode --> InstallingNodeDirect: 选择直接安装

    InstallingVM --> InstallingNode: 版本管理器安装成功
    InstallingVM --> Failed: 安装失败

    InstallingNode --> NodeReady: Node.js 安装成功
    InstallingNode --> Failed: 安装失败

    InstallingNodeDirect --> NodeReady: Node.js 安装成功
    InstallingNodeDirect --> Failed: 安装失败

    NodeReady --> InstallingClaude: 安装 Claude Code

    InstallingClaude --> Ready: 安装成功
    InstallingClaude --> Failed: 安装失败

    Ready --> [*]: 完成
    Failed --> [*]: 终止
```

## 10. 错误处理和回退

```mermaid
flowchart TD
    Start([执行安装步骤]) --> Try{尝试主要方法}

    Try -->|成功| Verify{验证安装}
    Try -->|失败| HasAlt{是否有<br/>备选方案?}

    HasAlt -->|是| TryAlt[尝试备选方案]
    HasAlt -->|否| ShowError([显示错误信息<br/>和手动解决建议])

    TryAlt -->|成功| Verify
    TryAlt -->|失败| ShowError

    Verify -->|通过| Success([✅ 步骤完成])
    Verify -->|失败| ShowError

    Success --> Next([继续下一步])
    ShowError --> End([终止安装])
```