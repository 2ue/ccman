# Desktop 清理功能 UI 设计规划

## 设计原则

### 架构原则
- ✅ **零胶水层**：主进程直接调用 `@ccman/core`
- ✅ **功能对等**：Desktop 能做的，CLI 也能做
- ✅ **简洁优先**：避免过度设计
- ✅ **一致性**：与现有 Desktop UI 风格保持一致

### 用户体验原则
- **可视化优先**：图表展示空间占用
- **实时反馈**：参数变化时实时显示预计效果
- **安全第一**：明确提示备份和风险
- **渐进增强**：基础功能 → 高级功能

---

## 页面结构设计

### 1. 页面入口

**位置选项：**

**方案 A：独立页面（推荐）**
```
导航栏：
  服务商配置
  预设模板
  → 清理配置 ✨ (新增)
  同步设置
```

**方案 B：设置页面的子项**
```
设置页面：
  同步配置
  → 清理配置 ✨ (新增)
  关于
```

**推荐：方案 A** - 清理是重要功能，值得独立页面

---

### 2. 页面布局

**整体布局：**
```
┌─────────────────────────────────────────────────────┐
│ 清理配置                                              │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌────────────────────┐  ┌────────────────────────┐ │
│  │  分析区域           │  │  可视化区域             │ │
│  │  (左侧 40%)        │  │  (右侧 60%)            │ │
│  │                    │  │                        │ │
│  │  - 文件大小         │  │  - 空间占用饼图         │ │
│  │  - 项目统计         │  │  - 项目历史柱状图       │ │
│  │  - Top 5 项目      │  │                        │ │
│  │                    │  │                        │ │
│  │  [分析] [刷新]     │  │                        │ │
│  └────────────────────┘  └────────────────────────┘ │
│                                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │  清理配置区域                                   │   │
│  │                                                │   │
│  │  [保守清理] [中等清理] [激进清理] [自定义]      │   │
│  │                                                │   │
│  │  预计节省: 496.8 KB → 775.1 KB                │   │
│  │                                                │   │
│  │  [ ] 清理项目历史记录                          │   │
│  │      保留最近 [10▼] 条记录                     │   │
│  │                                                │   │
│  │  [ ] 清理缓存数据 (约 30 KB)                   │   │
│  │  [ ] 重置使用统计                              │   │
│  │                                                │   │
│  │               [执行清理]                       │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │  备份管理（可选）                               │   │
│  │  最近备份: 2025-11-10 15:30:45                │   │
│  │  [查看所有备份]                                │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 组件设计

### 组件 1: CleanAnalysisCard（分析卡片）

**功能：**
- 显示文件大小
- 显示项目统计
- 显示 Top 5 项目
- 刷新按钮

**状态：**
```typescript
interface AnalysisState {
  loading: boolean
  data: AnalyzeResult | null
  error: string | null
}
```

**UI 元素：**
```tsx
<Card>
  <CardHeader>
    <Title>配置文件分析</Title>
    <Button onClick={refresh}>刷新</Button>
  </CardHeader>

  <CardContent>
    {loading ? (
      <Spinner />
    ) : (
      <>
        <Stat label="文件大小" value={data.fileSizeFormatted} />
        <Stat label="项目总数" value={data.projectCount} />
        <Stat label="历史记录" value={data.totalHistoryCount} />

        <Divider />

        <Title>历史最多项目</Title>
        <List>
          {data.projectHistory.slice(0, 5).map(p => (
            <ListItem key={p.path}>
              <Badge>{p.count}</Badge>
              <Text>{shortenPath(p.path)}</Text>
            </ListItem>
          ))}
        </List>
      </>
    )}
  </CardContent>
</Card>
```

---

### 组件 2: CleanVisualization（可视化图表）

**功能：**
- 空间占用饼图
- 项目历史柱状图

**图表库：**
- 使用 `recharts`（轻量级，React 友好）
- 或使用 CSS 手绘（简单场景）

**UI 元素：**
```tsx
<Card>
  <CardHeader>
    <Title>空间占用分布</Title>
  </CardHeader>

  <CardContent>
    <PieChart width={400} height={300}>
      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%">
        {pieData.map((entry, index) => (
          <Cell key={index} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>

    <Divider />

    <BarChart width={400} height={200} data={barData}>
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="count" fill="#8884d8" />
    </BarChart>
  </CardContent>
</Card>
```

**数据转换：**
```typescript
const pieData = [
  { name: '项目历史', value: historySize },
  { name: '缓存数据', value: cacheSize },
  { name: '配置状态', value: configSize },
]

const barData = analysis.projectHistory.slice(0, 10).map(p => ({
  name: shortenPath(p.path),
  count: p.count,
}))
```

---

### 组件 3: CleanConfigForm（清理配置表单）

**功能：**
- 预设方案选择（Tab 或 Radio）
- 自定义选项
- 实时预览节省空间

**状态：**
```typescript
interface ConfigState {
  mode: 'conservative' | 'moderate' | 'aggressive' | 'custom'
  options: CleanOptions
  estimatedSaving: number
}
```

**UI 元素：**
```tsx
<Card>
  <CardHeader>
    <Title>清理配置</Title>
  </CardHeader>

  <CardContent>
    {/* 预设方案选择 */}
    <Tabs value={mode} onChange={setMode}>
      <Tab value="conservative">
        <TabLabel>保守清理</TabLabel>
        <TabDesc>保留10条，清理缓存</TabDesc>
        <TabSaving>{formatBytes(estimatedSavings.conservative)}</TabSaving>
      </Tab>

      <Tab value="moderate">
        <TabLabel>中等清理</TabLabel>
        <TabDesc>保留5条，清理缓存和统计</TabDesc>
        <TabSaving>{formatBytes(estimatedSavings.moderate)}</TabSaving>
      </Tab>

      <Tab value="aggressive">
        <TabLabel>激进清理</TabLabel>
        <TabDesc>清空历史，清理所有</TabDesc>
        <TabSaving>{formatBytes(estimatedSavings.aggressive)}</TabSaving>
      </Tab>

      <Tab value="custom">
        <TabLabel>自定义</TabLabel>
      </Tab>
    </Tabs>

    {/* 自定义选项（仅在 custom 模式显示） */}
    {mode === 'custom' && (
      <Form>
        <Checkbox
          checked={options.cleanProjectHistory}
          onChange={(v) => updateOption('cleanProjectHistory', v)}
        >
          清理项目历史记录
        </Checkbox>

        {options.cleanProjectHistory && (
          <Slider
            label="保留最近 N 条记录"
            value={options.keepRecentCount}
            min={0}
            max={50}
            step={5}
            onChange={(v) => updateOption('keepRecentCount', v)}
          />
        )}

        <Checkbox
          checked={options.cleanCache}
          onChange={(v) => updateOption('cleanCache', v)}
        >
          清理缓存数据
          <Text muted>约 {formatBytes(analysis.cacheSize)}</Text>
        </Checkbox>

        <Checkbox
          checked={options.cleanStats}
          onChange={(v) => updateOption('cleanStats', v)}
        >
          重置使用统计
        </Checkbox>
      </Form>
    )}

    {/* 预计效果 */}
    <Alert type="info">
      <AlertIcon />
      <AlertContent>
        <AlertTitle>预计节省空间</AlertTitle>
        <AlertDesc>
          {formatBytes(sizeBefore)} → {formatBytes(sizeAfter)}
          <br />
          节省 <strong>{formatBytes(saved)}</strong> ({savedPercent}%)
        </AlertDesc>
      </AlertContent>
    </Alert>

    {/* 执行按钮 */}
    <Button
      variant="primary"
      onClick={handleClean}
      disabled={cleaning}
    >
      {cleaning ? <Spinner /> : null}
      执行清理
    </Button>
  </CardContent>
</Card>
```

---

### 组件 4: CleanResultModal（结果弹窗）

**功能：**
- 显示清理结果
- 显示备份路径
- 提供操作建议

**UI 元素：**
```tsx
<Modal open={resultOpen} onClose={() => setResultOpen(false)}>
  <ModalHeader>
    <SuccessIcon />
    <Title>清理完成</Title>
  </ModalHeader>

  <ModalContent>
    <ResultStat>
      <Label>清理前</Label>
      <Value>{formatBytes(result.sizeBefore)}</Value>
    </ResultStat>

    <Arrow />

    <ResultStat>
      <Label>清理后</Label>
      <Value success>{formatBytes(result.sizeAfter)}</Value>
    </ResultStat>

    <ResultHighlight>
      节省 {formatBytes(result.saved)} ({savedPercent}%)
    </ResultHighlight>

    <Divider />

    <List>
      {result.cleanedItems.projectHistory > 0 && (
        <ListItem>
          <CheckIcon />
          清理历史记录 {result.cleanedItems.projectHistory} 条
        </ListItem>
      )}
      {result.cleanedItems.cache && (
        <ListItem>
          <CheckIcon />
          清理缓存数据
        </ListItem>
      )}
      {result.cleanedItems.stats && (
        <ListItem>
          <CheckIcon />
          重置使用统计
        </ListItem>
      )}
    </List>

    <Alert type="warning">
      <AlertIcon />
      备份文件已保存至：
      <Code>{result.backupPath}</Code>
    </Alert>
  </ModalContent>

  <ModalFooter>
    <Button variant="secondary" onClick={openBackupFolder}>
      打开备份文件夹
    </Button>
    <Button variant="primary" onClick={() => setResultOpen(false)}>
      完成
    </Button>
  </ModalFooter>
</Modal>
```

---

### 组件 5: BackupManager（备份管理 - 可选）

**功能：**
- 列出所有备份文件
- 恢复备份
- 删除备份

**UI 元素：**
```tsx
<Card>
  <CardHeader>
    <Title>备份管理</Title>
  </CardHeader>

  <CardContent>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>时间</TableCell>
          <TableCell>大小</TableCell>
          <TableCell>操作</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {backups.map(backup => (
          <TableRow key={backup.path}>
            <TableCell>{formatDate(backup.timestamp)}</TableCell>
            <TableCell>{formatBytes(backup.size)}</TableCell>
            <TableCell>
              <Button size="sm" onClick={() => restore(backup)}>
                恢复
              </Button>
              <Button size="sm" variant="danger" onClick={() => remove(backup)}>
                删除
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

---

## Electron IPC 接口设计

### 主进程处理器（main.ts）

```typescript
import { ipcMain } from 'electron'
import { analyzeClaudeJson, cleanClaudeJson, type CleanOptions } from '@ccman/core'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * 分析配置文件
 */
ipcMain.handle('clean-analyze', async () => {
  try {
    const result = analyzeClaudeJson()
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

/**
 * 执行清理
 */
ipcMain.handle('clean-execute', async (event, options: CleanOptions) => {
  try {
    const result = cleanClaudeJson(options)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

/**
 * 获取备份列表
 */
ipcMain.handle('clean-get-backups', async () => {
  try {
    const claudeJsonPath = path.join(os.homedir(), '.claude.json')
    const dir = path.dirname(claudeJsonPath)
    const files = fs.readdirSync(dir)

    const backups = files
      .filter(f => f.startsWith('.claude.json.backup-'))
      .map(f => {
        const fullPath = path.join(dir, f)
        const stats = fs.statSync(fullPath)
        const timestamp = f.match(/backup-(.+)/)?.[1] || ''

        return {
          path: fullPath,
          filename: f,
          timestamp: new Date(timestamp.replace(/-/g, ':')),
          size: stats.size,
        }
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return { success: true, data: backups }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

/**
 * 恢复备份
 */
ipcMain.handle('clean-restore-backup', async (event, backupPath: string) => {
  try {
    const claudeJsonPath = path.join(os.homedir(), '.claude.json')
    fs.copyFileSync(backupPath, claudeJsonPath)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

/**
 * 删除备份
 */
ipcMain.handle('clean-delete-backup', async (event, backupPath: string) => {
  try {
    fs.unlinkSync(backupPath)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

/**
 * 打开备份文件夹
 */
ipcMain.handle('clean-open-backup-folder', async () => {
  try {
    const claudeJsonPath = path.join(os.homedir(), '.claude.json')
    const dir = path.dirname(claudeJsonPath)
    const { shell } = require('electron')
    shell.showItemInFolder(claudeJsonPath)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})
```

### Preload 脚本（preload.ts）

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // ... 现有 API

  // 清理 API
  clean: {
    analyze: () => ipcRenderer.invoke('clean-analyze'),
    execute: (options: any) => ipcRenderer.invoke('clean-execute', options),
    getBackups: () => ipcRenderer.invoke('clean-get-backups'),
    restoreBackup: (path: string) => ipcRenderer.invoke('clean-restore-backup', path),
    deleteBackup: (path: string) => ipcRenderer.invoke('clean-delete-backup', path),
    openBackupFolder: () => ipcRenderer.invoke('clean-open-backup-folder'),
  },
})
```

### 类型定义（renderer/types.ts）

```typescript
export interface ElectronAPI {
  // ... 现有 API

  clean: {
    analyze: () => Promise<{ success: boolean; data?: AnalyzeResult; error?: string }>
    execute: (options: CleanOptions) => Promise<{ success: boolean; data?: CleanResult; error?: string }>
    getBackups: () => Promise<{ success: boolean; data?: BackupInfo[]; error?: string }>
    restoreBackup: (path: string) => Promise<{ success: boolean; error?: string }>
    deleteBackup: (path: string) => Promise<{ success: boolean; error?: string }>
    openBackupFolder: () => Promise<{ success: boolean; error?: string }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

---

## React 页面实现

### CleanPage.tsx（主页面）

```typescript
import React, { useState, useEffect } from 'react'
import { CleanAnalysisCard } from '../components/CleanAnalysisCard'
import { CleanVisualization } from '../components/CleanVisualization'
import { CleanConfigForm } from '../components/CleanConfigForm'
import { CleanResultModal } from '../components/CleanResultModal'
import { BackupManager } from '../components/BackupManager'
import type { AnalyzeResult, CleanResult, CleanOptions } from '@ccman/core'

export function CleanPage() {
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [result, setResult] = useState<CleanResult | null>(null)
  const [resultOpen, setResultOpen] = useState(false)

  // 初始加载
  useEffect(() => {
    loadAnalysis()
  }, [])

  // 加载分析数据
  const loadAnalysis = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.clean.analyze()
      if (res.success && res.data) {
        setAnalysis(res.data)
      } else {
        // 错误处理
      }
    } finally {
      setLoading(false)
    }
  }

  // 执行清理
  const handleClean = async (options: CleanOptions) => {
    setCleaning(true)
    try {
      const res = await window.electronAPI.clean.execute(options)
      if (res.success && res.data) {
        setResult(res.data)
        setResultOpen(true)
        // 重新加载分析数据
        await loadAnalysis()
      } else {
        // 错误处理
      }
    } finally {
      setCleaning(false)
    }
  }

  return (
    <div className="clean-page">
      <h1>清理配置</h1>

      <div className="clean-grid">
        {/* 左侧：分析区域 */}
        <div className="clean-left">
          <CleanAnalysisCard
            analysis={analysis}
            loading={loading}
            onRefresh={loadAnalysis}
          />
        </div>

        {/* 右侧：可视化区域 */}
        <div className="clean-right">
          <CleanVisualization analysis={analysis} />
        </div>
      </div>

      {/* 清理配置表单 */}
      <CleanConfigForm
        analysis={analysis}
        onClean={handleClean}
        cleaning={cleaning}
      />

      {/* 备份管理（可选） */}
      <BackupManager />

      {/* 结果弹窗 */}
      <CleanResultModal
        open={resultOpen}
        result={result}
        onClose={() => setResultOpen(false)}
      />
    </div>
  )
}
```

---

## 状态管理

**简单方案（推荐）：**
- 使用 React `useState` 和 `useEffect`
- 不需要 Redux/Zustand（功能简单）

**数据流：**
```
组件挂载
  → loadAnalysis()
    → IPC 调用
      → 更新 state

用户选择方案
  → 更新 options state
    → 计算预计节省
      → 更新 UI

用户点击执行
  → handleClean(options)
    → IPC 调用
      → 显示结果弹窗
        → 重新加载分析
```

---

## 开发优先级

### Phase 1: 基础功能（MVP）
1. ✅ CleanAnalysisCard（基础信息展示）
2. ✅ CleanConfigForm（3种预设 + 执行按钮）
3. ✅ CleanResultModal（结果展示）
4. ✅ IPC 接口实现

### Phase 2: 增强体验
1. CleanVisualization（饼图 + 柱状图）
2. 自定义配置表单（滑块、复选框）
3. 实时预览节省空间

### Phase 3: 高级功能（可选）
1. BackupManager（备份列表管理）
2. 项目选择器（多选项目清理）
3. 清理历史记录（记录每次清理）

---

## 技术栈

### UI 组件
- **基础组件**：复用现有 UI 组件库（项目已有）
- **图标**：lucide-react（项目已统一使用）
- **图表**：recharts 或 CSS 手绘

### 样式
- 复用现有样式系统
- 保持与其他页面一致

### 依赖
- ❌ 不引入新的状态管理库
- ❌ 不引入新的图标库
- ✅ 可选：recharts（如果需要复杂图表）

---

## 实现检查清单

### Core 层（已完成 ✅）
- [x] analyzeClaudeJson()
- [x] cleanClaudeJson()
- [x] CleanPresets
- [x] 类型定义导出

### CLI 层（已完成 ✅）
- [x] clean:analyze 命令
- [x] clean 命令（交互式 + 参数）
- [x] 帮助文档

### Desktop 层（待实现）
- [ ] IPC 处理器（main.ts）
- [ ] Preload 脚本
- [ ] 类型定义
- [ ] CleanAnalysisCard 组件
- [ ] CleanConfigForm 组件
- [ ] CleanResultModal 组件
- [ ] CleanPage 页面
- [ ] 路由注册
- [ ] 导航菜单更新

---

## 风险和注意事项

### 安全性
- ✅ 自动备份机制（core 已实现）
- ✅ 原子写入（core 已实现）
- ⚠️ 需要明确提示用户备份位置

### 性能
- ✅ 分析操作很快（< 100ms）
- ✅ 清理操作很快（< 500ms）
- ⚠️ 图表渲染可能需要优化（大数据集）

### 用户体验
- ✅ 清晰的预览和提示
- ⚠️ 需要防止误操作（确认弹窗）
- ⚠️ 需要提供恢复机制（备份管理）

---

## 下一步行动

1. **立即可做**：实现 IPC 接口（< 1小时）
2. **短期目标**：实现 MVP（CleanAnalysisCard + CleanConfigForm）
3. **中期目标**：添加可视化图表
4. **长期目标**：完善备份管理

---

## 总结

**架构优势：**
- ✅ 核心逻辑共享（CLI 和 Desktop 零重复）
- ✅ 零胶水层（Desktop 直接调用 core）
- ✅ 类型安全（TypeScript 全栈）
- ✅ 功能对等（两端能力一致）

**实现简洁：**
- Core: ~300 行（claude-clean.ts）
- CLI: ~250 行（clean.ts）
- Desktop (预计): ~600 行（6个组件 × ~100行）
- Total: < 1200 行（完整功能）

**符合项目规范：**
- ✅ 每个文件 < 300 行
- ✅ 每个函数 < 50 行
- ✅ 简洁至上
- ✅ 零破坏性
