# ~/.claude.json 字段分析报告

**文件路径**: `~/.claude.json`
**文件大小**: 773.8KB
**分析时间**: 2025-11-10

## 执行摘要

该配置文件主要用于存储 Claude Code 的用户设置、项目历史记录和各种缓存数据。文件过大（773.8KB）的主要原因是：
1. 15个项目共417条历史对话记录
2. 缓存的更新日志（~30KB）
3. 各种使用统计和状态信息

## 字段详细分析

### 1. 核心配置字段（不应清理）

| 字段名 | 类型 | 大小/值 | 说明 |
|--------|------|---------|------|
| `userID` | string | 64 chars | 用户唯一标识符 |
| `firstStartTime` | string | 24 chars | 首次启动时间 |
| `installMethod` | string | 7 chars | 安装方式 |
| `autoUpdates` | boolean | true | 自动更新开关 |
| `editorMode` | string | "vim" | 编辑器模式 |
| `mcpServers` | dict | 10 keys | MCP 服务器配置 |

**建议**: 这些字段包含核心用户配置，**绝对不能删除或修改**。

---

### 2. 缓存数据（可安全清理）

| 字段名 | 类型 | 大小 | 说明 | 清理影响 |
|--------|------|------|------|----------|
| `cachedChangelog` | string | 29,687 chars (~30KB) | 缓存的更新日志 | 下次启动时重新获取 |
| `cachedDynamicConfigs` | dict | 1 key | 动态配置缓存 | 下次启动时重新获取 |
| `cachedStatsigGates` | dict | 3 keys | Statsig 特性开关缓存 | 下次启动时重新获取 |
| `changelogLastFetched` | int | timestamp | 更新日志最后获取时间 | 重置为0即可 |

**建议**: 这些缓存数据可以**安全删除**，Claude Code 会在下次启动时重新获取。

**预计节省空间**: ~30-35KB

---

### 3. 项目历史记录（主要占用空间）

| 字段名 | 类型 | 大小 | 说明 |
|--------|------|------|------|
| `projects` | dict | 15 keys | 所有项目的配置和历史 |

**项目历史记录统计**:

```
项目总数: 15
总历史记录数: 417

各项目历史记录数量:
  antool-mono:        100 条  (已达上限)
  star-man:           100 条  (已达上限)
  md-save:             91 条
  api-center:          43 条
  ccxman:              24 条
  cmrid-ecs-board:     16 条
  burnote:             14 条
  tbpm-fe:              9 条
  markdown-ed:          6 条
  andon-ui:             5 条
  prompt-c:             4 条
  cc-agents:            2 条
  /Users/yuanfeijie:    2 条
  knote:                1 条
  fundqq:               0 条
```

**每条记录包含**:
- 用户输入的 `display` 文本
- 粘贴的内容 `pastedContents`（可能包含大段代码/文档）
- MCP 上下文 URI
- 项目配置信息

**预计占用**: 约650-700KB（文件大小的主要来源）

**建议清理策略**:
1. **保守策略**: 每个项目只保留最近10条记录
2. **中等策略**: 每个项目只保留最近5条记录
3. **激进策略**: 清空所有历史记录（保留项目配置）
4. **选择性清理**: 清理指定项目的历史记录

---

### 4. 使用统计（可选清理）

| 字段名 | 类型 | 值 | 说明 |
|--------|------|-----|------|
| `numStartups` | int | 769 | 启动次数统计 |
| `promptQueueUseCount` | int | 1187 | 提示队列使用次数 |
| `tipsHistory` | dict | 28 keys | 各种提示的显示次数 |
| `lastPlanModeUse` | int | timestamp | 最后使用计划模式时间 |
| `subscriptionNoticeCount` | int | 0 | 订阅通知计数 |

**建议**: 这些统计数据占用空间不大（<5KB），但如果希望"重置"使用统计，可以清理。

---

### 5. 功能标志和状态（不建议清理）

| 字段名 | 类型 | 值 | 说明 |
|--------|------|-----|------|
| `hasCompletedOnboarding` | boolean | true | 是否完成引导流程 |
| `hasSeenTasksHint` | boolean | true | 是否看过任务提示 |
| `hasIdeOnboardingBeenShown` | dict | 3 keys | IDE 引导显示状态 |
| `shiftEnterKeyBindingInstalled` | boolean | true | Shift+Enter 快捷键安装状态 |
| `hasUsedBackslashReturn` | boolean | true | 是否使用过反斜杠回车 |
| `sonnet45MigrationComplete` | boolean | true | Sonnet 4.5 迁移完成标志 |
| `hasAcknowledgedCostThreshold` | boolean | true | 是否确认过成本阈值 |
| `bypassPermissionsModeAccepted` | boolean | true | 是否接受绕过权限模式 |

**建议**: 这些标志记录用户的使用状态，删除后会导致：
- 重新显示引导提示
- 重新安装快捷键
- 重置各种"已确认"状态

**除非想重置所有提示和引导，否则不建议清理**。

---

### 6. 订阅和计划相关

| 字段名 | 类型 | 值 | 说明 |
|--------|------|-----|------|
| `hasAvailableSubscription` | boolean | false | 是否有可用订阅 |
| `hasOpusPlanDefault` | boolean | false | 是否有 Opus 计划默认设置 |
| `isQualifiedForDataSharing` | boolean | false | 是否符合数据分享条件 |

**建议**: 这些字段由 Claude Code 自动管理，**不应手动修改**。

---

### 7. 其他配置

| 字段名 | 类型 | 值 | 说明 |
|--------|------|-----|------|
| `showExpandedTodos` | boolean | true | todos 展开显示状态 |
| `fallbackAvailableWarningThreshold` | float | 0.5 | 回退可用警告阈值 |
| `feedbackSurveyState` | dict | 1 key | 反馈调查状态 |
| `lastOnboardingVersion` | string | 6 chars | 最后引导版本 |
| `lastReleaseNotesSeen` | string | 6 chars | 最后看到的发布说明 |

**建议**: 保留这些配置，除非想重置 UI 状态。

---

## 清理方案设计

### 方案 1: 保守清理（推荐）

**清理内容**:
- 清空缓存数据（`cachedChangelog`, `cachedDynamicConfigs`, `cachedStatsigGates`）
- 每个项目保留最近10条历史记录

**预计节省**: 350-400KB
**风险等级**: 低
**影响**: 几乎无影响，仅丢失部分历史记录

---

### 方案 2: 中等清理

**清理内容**:
- 清空所有缓存数据
- 每个项目保留最近5条历史记录
- 重置使用统计（可选）

**预计节省**: 500-550KB
**风险等级**: 低
**影响**: 丢失大部分历史记录，统计数据归零

---

### 方案 3: 激进清理

**清理内容**:
- 清空所有缓存数据
- 清空所有项目历史记录（保留项目配置）
- 重置所有使用统计
- 重置部分功能标志（重新显示引导）

**预计节省**: 650-700KB
**风险等级**: 中
**影响**:
- 丢失所有历史记录
- 重新显示所有引导和提示
- 统计数据归零

---

### 方案 4: 自定义清理

提供交互式选项，用户可以选择：
- 清理哪些项目的历史
- 保留多少条记录
- 是否清理缓存
- 是否重置统计

---

## 实现建议

### 数据结构（简单直接）

```typescript
// types.ts
export interface CleanOptions {
  // 项目历史清理
  cleanProjectHistory?: boolean
  keepRecentCount?: number          // 每个项目保留最近N条
  projectPaths?: string[]           // 只清理指定项目

  // 缓存清理
  cleanCache?: boolean

  // 统计清理
  cleanStats?: boolean

  // 功能标志重置
  resetFlags?: boolean
}

export interface CleanResult {
  sizeBefore: number
  sizeAfter: number
  saved: number
  itemsCleaned: {
    projectHistory: number
    cache: boolean
    stats: boolean
  }
}
```

### 核心函数（< 50 行/函数）

```typescript
// clean.ts

/**
 * 清理 ~/.claude.json 文件
 * 遵循"零破坏性"原则：备份 -> 清理 -> 验证
 */
export function cleanClaudeJson(options: CleanOptions): CleanResult {
  const configPath = path.join(os.homedir(), '.claude.json')

  // 1. 备份
  backupFile(configPath)

  // 2. 加载配置
  const config = loadJson(configPath)
  const sizeBefore = getFileSize(configPath)

  // 3. 清理（修改 config 对象）
  const cleaned = applyCleanOptions(config, options)

  // 4. 保存（原子写入）
  saveJsonAtomic(configPath, config)

  // 5. 返回结果
  const sizeAfter = getFileSize(configPath)
  return {
    sizeBefore,
    sizeAfter,
    saved: sizeBefore - sizeAfter,
    itemsCleaned: cleaned
  }
}

function applyCleanOptions(config: any, options: CleanOptions) {
  let projectHistoryCount = 0

  // 清理项目历史
  if (options.cleanProjectHistory && config.projects) {
    for (const [projectPath, projectData] of Object.entries(config.projects)) {
      if (shouldCleanProject(projectPath, options.projectPaths)) {
        const originalCount = projectData.history?.length || 0
        projectData.history = keepRecent(
          projectData.history,
          options.keepRecentCount || 10
        )
        projectHistoryCount += originalCount - projectData.history.length
      }
    }
  }

  // 清理缓存
  if (options.cleanCache) {
    delete config.cachedChangelog
    delete config.cachedDynamicConfigs
    delete config.cachedStatsigGates
    config.changelogLastFetched = 0
  }

  // 清理统计
  if (options.cleanStats) {
    config.numStartups = 0
    config.promptQueueUseCount = 0
    config.tipsHistory = {}
  }

  return {
    projectHistory: projectHistoryCount,
    cache: options.cleanCache || false,
    stats: options.cleanStats || false
  }
}

// 辅助函数（每个 < 10 行）
function keepRecent<T>(arr: T[], count: number): T[] {
  if (!Array.isArray(arr)) return []
  return arr.slice(-count)
}

function shouldCleanProject(path: string, whitelist?: string[]): boolean {
  if (!whitelist || whitelist.length === 0) return true
  return whitelist.includes(path)
}
```

---

## CLI 命令设计

### 分析命令
```bash
ccman clean:analyze ~/.claude.json
```

输出：
```
📊 ~/.claude.json 分析报告

文件大小: 773.8 KB

空间占用分布:
  项目历史记录:   ~650 KB (84%)
  缓存数据:        ~30 KB  (4%)
  配置和状态:      ~94 KB  (12%)

项目历史记录详情:
  15 个项目, 417 条记录
  最大: antool-mono (100 条), star-man (100 条)

清理建议:
  保守清理可节省: ~350 KB
  中等清理可节省: ~550 KB
  激进清理可节省: ~700 KB
```

### 清理命令
```bash
# 交互式清理
ccman clean ~/.claude.json

# 保守清理（默认）
ccman clean ~/.claude.json --preset conservative

# 中等清理
ccman clean ~/.claude.json --preset moderate

# 激进清理
ccman clean ~/.claude.json --preset aggressive

# 自定义清理
ccman clean ~/.claude.json \
  --keep-history 5 \
  --clean-cache \
  --projects "antool-mono,star-man"
```

---

## 安全保障

### 备份机制
```typescript
function backupFile(filePath: string): string {
  const timestamp = new Date().toISOString().replace(/:/g, '-')
  const backupPath = `${filePath}.backup-${timestamp}`
  fs.copyFileSync(filePath, backupPath)
  return backupPath
}
```

### 原子写入
```typescript
function saveJsonAtomic(filePath: string, data: any): void {
  const tempPath = `${filePath}.tmp`
  const content = JSON.stringify(data, null, 2)

  fs.writeFileSync(tempPath, content, { mode: 0o600 })
  fs.renameSync(tempPath, filePath)  // 原子操作
}
```

### 验证
```typescript
function validateConfig(config: any): boolean {
  // 必须包含的字段
  const required = ['userID', 'firstStartTime', 'mcpServers']
  return required.every(key => key in config)
}
```

---

## 总结

1. **主要问题**: 项目历史记录占用过多空间（~650KB）
2. **建议方案**: 保守清理，保留最近10条记录
3. **实现原则**: 简单直接，零破坏性，原子操作
4. **代码风格**: 遵循 ccman 项目规范（< 50行/函数，< 300行/文件）

---

## 附录：完整字段列表

```
autoUpdates                              bool            True
bypassPermissionsModeAccepted            bool            True
cachedChangelog                          str             29687 chars
cachedDynamicConfigs                     dict            1 keys
cachedStatsigGates                       dict            3 keys
changelogLastFetched                     int             1760608299675
editorMode                               str             3 chars
fallbackAvailableWarningThreshold        float           0.5
feedbackSurveyState                      dict            1 keys
firstStartTime                           str             24 chars
hasAcknowledgedCostThreshold             bool            True
hasAvailableSubscription                 bool            False
hasCompletedOnboarding                   bool            True
hasIdeOnboardingBeenShown                dict            3 keys
hasOpusPlanDefault                       bool            False
hasSeenTasksHint                         bool            True
hasUsedBackslashReturn                   bool            True
installMethod                            str             7 chars
isQualifiedForDataSharing                bool            False
lastOnboardingVersion                    str             6 chars
lastPlanModeUse                          int             1760236377698
lastReleaseNotesSeen                     str             6 chars
mcpServers                               dict            10 keys
numStartups                              int             769
projects                                 dict            15 keys
promptQueueUseCount                      int             1187
shiftEnterKeyBindingInstalled            bool            True
showExpandedTodos                        bool            True
sonnet45MigrationComplete                bool            True
subscriptionNoticeCount                  int             0
tipsHistory                              dict            28 keys
userID                                   str             64 chars
```
