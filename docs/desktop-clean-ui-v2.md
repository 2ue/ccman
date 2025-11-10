# Desktop 清理功能 UI 设计 V2（简化版）

## 设计理念

基于用户反馈重新设计，核心原则：

1. **直观展示**：列表展示所有数据，不用图表
2. **细粒度控制**：每个项目/缓存都可单独删除
3. **快速操作**：顶部提供3个预设清理按钮
4. **简洁实现**：3个组件，~400行代码

---

## 页面布局

```
┌───────────────────────────────────────────────────────┐
│ 清理配置                                               │
├───────────────────────────────────────────────────────┤
│                                                        │
│ ┌────────────────────────────────────────────────┐   │
│ │ CleanHeader (顶部控制区)                        │   │
│ │                                                 │   │
│ │ 📊 文件大小: 775.1 KB                          │   │
│ │                                                 │   │
│ │ [保守清理] [中等清理] [激进清理]     [刷新]     │   │
│ └────────────────────────────────────────────────┘   │
│                                                        │
│ ┌────────────────────────────────────────────────┐   │
│ │ ProjectHistoryTable (项目历史表格)              │   │
│ │                                                 │   │
│ │ 📁 项目历史会话 (15个项目, 421条记录)           │   │
│ │                                                 │   │
│ │ ┌─────────────────────────────────────────┐   │   │
│ │ │ 项目路径        │消息数│ 大小 │最后消息│操作│   │   │
│ │ ├─────────────────────────────────────────┤   │   │
│ │ │ antool-mono    │ 100 │120KB│创建组件  │[删]│   │   │
│ │ │ star-man       │ 100 │115KB│修复bug   │[删]│   │   │
│ │ │ md-save        │  94 │105KB│添加功能  │[删]│   │   │
│ │ │ api-center     │  43 │ 52KB│更新文档  │[删]│   │   │
│ │ │ ccxman         │  25 │ 28KB│优化性能  │[删]│   │   │
│ │ │ ...            │     │     │          │   │   │   │
│ │ └─────────────────────────────────────────┘   │   │
│ └────────────────────────────────────────────────┘   │
│                                                        │
│ ┌────────────────────────────────────────────────┐   │
│ │ CacheInfoTable (缓存信息表格)                   │   │
│ │                                                 │   │
│ │ 💾 缓存信息 (4项缓存, 约30KB)                   │   │
│ │                                                 │   │
│ │ ┌─────────────────────────────────────────┐   │   │
│ │ │ 缓存项         │ 大小  │ 最后更新 │ 操作 │   │   │
│ │ ├─────────────────────────────────────────┤   │   │
│ │ │ 更新日志       │ 29KB │ 2天前    │ [删] │   │   │
│ │ │ 动态配置       │0.5KB │ 1小时前  │ [删] │   │   │
│ │ │ 特性开关       │0.3KB │ 1小时前  │ [删] │   │   │
│ │ │ 提示历史       │0.2KB │ 1天前    │ [删] │   │   │
│ │ └─────────────────────────────────────────┘   │   │
│ └────────────────────────────────────────────────┘   │
│                                                        │
└───────────────────────────────────────────────────────┘
```

---

## 组件设计

### 1. CleanHeader - 顶部控制区

**职责：**
- 显示文件总大小
- 提供3个预设清理按钮
- 提供刷新按钮

**代码结构：**
```typescript
interface CleanHeaderProps {
  fileSize: string              // "775.1 KB"
  onPresetClean: (preset: 'conservative' | 'moderate' | 'aggressive') => void
  onRefresh: () => void
  loading: boolean
}

export function CleanHeader({ fileSize, onPresetClean, onRefresh, loading }: CleanHeaderProps) {
  return (
    <div className="clean-header">
      <div className="file-size">
        <span>📊 文件大小: </span>
        <strong>{fileSize}</strong>
      </div>

      <div className="actions">
        <Button
          variant="success"
          onClick={() => onPresetClean('conservative')}
          disabled={loading}
        >
          保守清理
        </Button>

        <Button
          variant="warning"
          onClick={() => onPresetClean('moderate')}
          disabled={loading}
        >
          中等清理
        </Button>

        <Button
          variant="danger"
          onClick={() => onPresetClean('aggressive')}
          disabled={loading}
        >
          激进清理
        </Button>

        <Button
          variant="secondary"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? <Spinner /> : '刷新'}
        </Button>
      </div>
    </div>
  )
}
```

**样式：**
```css
.clean-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 24px;
}

.file-size {
  font-size: 16px;
}

.actions {
  display: flex;
  gap: 8px;
}
```

**预计代码量：** ~50行

---

### 2. ProjectHistoryTable - 项目历史表格

**职责：**
- 显示所有项目的历史记录
- 每行显示：路径、消息数、大小、最后消息、删除按钮
- 支持路径点击（打开项目）
- 支持排序（按大小、消息数）

**数据结构：**
```typescript
interface ProjectHistoryTableProps {
  projects: ProjectDetail[]      // 来自 getProjectDetails()
  onDelete: (projectPath: string) => void
  loading: boolean
}

interface ProjectDetail {
  path: string                   // "/Users/xx/project/antool-mono"
  historyCount: number           // 100
  estimatedSize: number          // 120000 (字节)
  lastMessage?: string           // "创建新组件"
}
```

**代码结构：**
```typescript
export function ProjectHistoryTable({ projects, onDelete, loading }: ProjectHistoryTableProps) {
  const [sortBy, setSortBy] = useState<'size' | 'count'>('size')

  // 排序
  const sorted = [...projects].sort((a, b) => {
    if (sortBy === 'size') {
      return b.estimatedSize - a.estimatedSize
    }
    return b.historyCount - a.historyCount
  })

  const handleDelete = async (path: string) => {
    const confirmed = await confirm(
      '确认删除？',
      `将清空项目 "${shortenPath(path)}" 的所有历史记录`
    )
    if (confirmed) {
      onDelete(path)
    }
  }

  return (
    <div className="project-history-table">
      <div className="table-header">
        <h3>📁 项目历史会话</h3>
        <span className="count">
          {projects.length} 个项目, {totalCount} 条记录
        </span>
      </div>

      <table>
        <thead>
          <tr>
            <th>项目路径</th>
            <th onClick={() => setSortBy('count')} className="sortable">
              消息数 {sortBy === 'count' && '▼'}
            </th>
            <th onClick={() => setSortBy('size')} className="sortable">
              大小 {sortBy === 'size' && '▼'}
            </th>
            <th>最后消息</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(project => (
            <tr key={project.path}>
              <td>
                <span
                  className="path-link"
                  onClick={() => openProject(project.path)}
                  title={project.path}
                >
                  {shortenPath(project.path)}
                </span>
              </td>
              <td>{project.historyCount}</td>
              <td>{formatBytes(project.estimatedSize)}</td>
              <td className="last-message">
                {truncate(project.lastMessage, 30)}
              </td>
              <td>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDelete(project.path)}
                  disabled={loading}
                >
                  删除
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 辅助函数
function shortenPath(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

function truncate(text: string | undefined, maxLen: number): string {
  if (!text) return '-'
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

function openProject(path: string) {
  window.electronAPI.shell.openPath(path)
}
```

**样式要点：**
```css
.project-history-table {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.path-link {
  color: #3b82f6;
  cursor: pointer;
  text-decoration: underline;
}

.path-link:hover {
  color: #2563eb;
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.sortable:hover {
  background: #f5f5f5;
}

.last-message {
  color: #666;
  font-size: 14px;
}
```

**预计代码量：** ~200行

---

### 3. CacheInfoTable - 缓存信息表格

**职责：**
- 显示所有缓存项
- 每行显示：缓存名称、大小、最后更新、删除按钮
- 支持相对时间显示（1小时前、2天前）

**数据结构：**
```typescript
interface CacheInfoTableProps {
  caches: CacheDetail[]          // 来自 getCacheDetails()
  onDelete: (cacheKey: string) => void
  loading: boolean
}

interface CacheDetail {
  key: string                    // 'cachedChangelog'
  name: string                   // '更新日志'
  size: number                   // 29687
  sizeFormatted: string          // '29 KB'
  lastUpdated?: number           // 时间戳
}
```

**代码结构：**
```typescript
export function CacheInfoTable({ caches, onDelete, loading }: CacheInfoTableProps) {
  const handleDelete = async (cache: CacheDetail) => {
    const confirmed = await confirm(
      '确认删除？',
      `将删除缓存项 "${cache.name}"`
    )
    if (confirmed) {
      onDelete(cache.key)
    }
  }

  const totalSize = caches.reduce((sum, c) => sum + c.size, 0)

  return (
    <div className="cache-info-table">
      <div className="table-header">
        <h3>💾 缓存信息</h3>
        <span className="count">
          {caches.length} 项缓存, 约 {formatBytes(totalSize)}
        </span>
      </div>

      <table>
        <thead>
          <tr>
            <th>缓存项</th>
            <th>大小</th>
            <th>最后更新</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {caches.map(cache => (
            <tr key={cache.key}>
              <td>{cache.name}</td>
              <td>{cache.sizeFormatted}</td>
              <td>
                {cache.lastUpdated
                  ? formatRelativeTime(cache.lastUpdated)
                  : '-'}
              </td>
              <td>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDelete(cache)}
                  disabled={loading}
                >
                  删除
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 辅助函数
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  return '刚刚'
}
```

**预计代码量：** ~150行

---

## CleanPage - 主页面

**职责：**
- 管理全局状态
- 协调3个组件
- 调用 Electron IPC

**代码结构：**
```typescript
export function CleanPage() {
  const [fileSize, setFileSize] = useState('')
  const [projects, setProjects] = useState<ProjectDetail[]>([])
  const [caches, setCaches] = useState<CacheDetail[]>([])
  const [loading, setLoading] = useState(false)

  // 初始加载
  useEffect(() => {
    loadData()
  }, [])

  // 加载所有数据
  const loadData = async () => {
    setLoading(true)
    try {
      // 并行加载
      const [analysisRes, projectsRes, cachesRes] = await Promise.all([
        window.electronAPI.clean.analyze(),
        window.electronAPI.clean.getProjects(),
        window.electronAPI.clean.getCaches(),
      ])

      if (analysisRes.success) {
        setFileSize(analysisRes.data.fileSizeFormatted)
      }
      if (projectsRes.success) {
        setProjects(projectsRes.data)
      }
      if (cachesRes.success) {
        setCaches(cachesRes.data)
      }
    } catch (error) {
      showError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // 预设清理
  const handlePresetClean = async (preset: string) => {
    const confirmed = await confirm(
      '确认清理？',
      getPresetDescription(preset)
    )
    if (!confirmed) return

    setLoading(true)
    try {
      const result = await window.electronAPI.clean.executePreset(preset)
      if (result.success) {
        showSuccess(`清理完成，节省 ${formatBytes(result.data.saved)}`)
        await loadData() // 重新加载
      }
    } catch (error) {
      showError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // 删除单个项目
  const handleDeleteProject = async (path: string) => {
    setLoading(true)
    try {
      const result = await window.electronAPI.clean.deleteProject(path)
      if (result.success) {
        showSuccess('已删除项目历史')
        await loadData()
      }
    } catch (error) {
      showError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // 删除单个缓存
  const handleDeleteCache = async (key: string) => {
    setLoading(true)
    try {
      const result = await window.electronAPI.clean.deleteCache(key)
      if (result.success) {
        showSuccess('已删除缓存')
        await loadData()
      }
    } catch (error) {
      showError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="clean-page">
      <h1>清理配置</h1>

      <CleanHeader
        fileSize={fileSize}
        onPresetClean={handlePresetClean}
        onRefresh={loadData}
        loading={loading}
      />

      <ProjectHistoryTable
        projects={projects}
        onDelete={handleDeleteProject}
        loading={loading}
      />

      <CacheInfoTable
        caches={caches}
        onDelete={handleDeleteCache}
        loading={loading}
      />
    </div>
  )
}

function getPresetDescription(preset: string): string {
  switch (preset) {
    case 'conservative':
      return '保留最近10条记录，清理缓存数据'
    case 'moderate':
      return '保留最近5条记录，清理缓存和统计'
    case 'aggressive':
      return '清空所有历史记录和缓存'
    default:
      return ''
  }
}
```

---

## Electron IPC 接口

### Main Process (main.ts)

```typescript
import { ipcMain } from 'electron'
import {
  analyzeClaudeJson,
  getProjectDetails,
  getCacheDetails,
  deleteProjectHistory,
  deleteCacheItem,
  cleanClaudeJson,
  CleanPresets,
} from '@ccman/core'

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
 * 获取项目列表
 */
ipcMain.handle('clean-get-projects', async () => {
  try {
    const result = getProjectDetails()
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

/**
 * 获取缓存列表
 */
ipcMain.handle('clean-get-caches', async () => {
  try {
    const result = getCacheDetails()
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

/**
 * 删除单个项目
 */
ipcMain.handle('clean-delete-project', async (event, projectPath: string) => {
  try {
    deleteProjectHistory(projectPath)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

/**
 * 删除单个缓存
 */
ipcMain.handle('clean-delete-cache', async (event, cacheKey: string) => {
  try {
    deleteCacheItem(cacheKey)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

/**
 * 执行预设清理
 */
ipcMain.handle('clean-execute-preset', async (event, preset: string) => {
  try {
    let options
    if (preset === 'conservative') {
      options = CleanPresets.conservative()
    } else if (preset === 'moderate') {
      options = CleanPresets.moderate()
    } else if (preset === 'aggressive') {
      options = CleanPresets.aggressive()
    } else {
      throw new Error('未知的预设方案')
    }

    const result = cleanClaudeJson(options)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})
```

### Preload Script (preload.ts)

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // ... 现有 API

  clean: {
    analyze: () => ipcRenderer.invoke('clean-analyze'),
    getProjects: () => ipcRenderer.invoke('clean-get-projects'),
    getCaches: () => ipcRenderer.invoke('clean-get-caches'),
    deleteProject: (path: string) => ipcRenderer.invoke('clean-delete-project', path),
    deleteCache: (key: string) => ipcRenderer.invoke('clean-delete-cache', key),
    executePreset: (preset: string) => ipcRenderer.invoke('clean-execute-preset', preset),
  },

  shell: {
    openPath: (path: string) => ipcRenderer.invoke('shell-open-path', path),
  },
})
```

---

## 代码量统计

| 组件/模块 | 代码量 | 说明 |
|-----------|--------|------|
| CleanHeader | ~50行 | 顶部控制区 |
| ProjectHistoryTable | ~200行 | 项目表格 |
| CacheInfoTable | ~150行 | 缓存表格 |
| CleanPage | ~100行 | 主页面 |
| IPC Handlers (main) | ~80行 | 主进程处理 |
| Preload | ~20行 | 预加载脚本 |
| **总计** | **~600行** | |

比 V1 版本（~1200行）减少了一半！

---

## 对比分析

### V1 设计（复杂版）
- ❌ 5个组件（CleanAnalysisCard, CleanVisualization, CleanConfigForm, CleanResultModal, BackupManager）
- ❌ 需要图表库（recharts）
- ❌ 复杂的表单状态管理
- ❌ 过多的弹窗交互
- ❌ ~1200行代码

### V2 设计（简化版）
- ✅ 3个组件（CleanHeader, ProjectHistoryTable, CacheInfoTable）
- ✅ 不需要图表库
- ✅ 简单的列表展示
- ✅ 直接的删除操作
- ✅ ~600行代码

---

## 用户体验优势

### 1. 更直观
- 所有数据一目了然
- 不需要切换视图
- 不需要理解图表

### 2. 更灵活
- 可以逐个删除项目
- 可以选择性清理缓存
- 可以快速批量清理（预设按钮）

### 3. 更快速
- 加载更快（不需要渲染图表）
- 操作更快（一键删除）
- 反馈更快（即时刷新）

---

## 实现计划

### Phase 1: 基础功能（2-3天）
- [x] Core 扩展功能（已完成）
- [ ] IPC 接口实现
- [ ] CleanHeader 组件
- [ ] ProjectHistoryTable 组件
- [ ] CacheInfoTable 组件
- [ ] CleanPage 页面集成

### Phase 2: 优化体验（1-2天）
- [ ] 排序功能
- [ ] 路径点击打开
- [ ] 相对时间显示
- [ ] 确认对话框
- [ ] 成功/失败通知

### Phase 3: 完善细节（1天）
- [ ] 空状态处理
- [ ] 错误处理
- [ ] 加载状态优化
- [ ] 样式美化

---

## 技术栈

### 必须
- React（已有）
- lucide-react（图标，已有）

### 不需要
- ❌ recharts（不需要图表）
- ❌ Zustand/Redux（简单状态）
- ❌ 其他图标库（统一 lucide-react）

---

## 符合项目规范检查

- ✅ **简洁至上**：3个组件，每个 < 200行
- ✅ **数据结构优先**：Core 提供所有数据，UI 只展示
- ✅ **零破坏性**：每个操作都有备份
- ✅ **实用主义**：解决实际问题，不过度设计
- ✅ **零胶水层**：Main Process 直接调用 Core

---

## 总结

**V2 设计的核心改进：**

1. **去掉复杂图表** → 简单列表
2. **去掉配置表单** → 直接删除按钮
3. **去掉结果弹窗** → 通知提示
4. **去掉备份管理** → 自动备份（不需要UI）

**结果：**
- 代码量减半（600行 vs 1200行）
- 功能更强大（细粒度控制）
- 用户体验更好（直观、快速）
- 更符合项目规范（简洁至上）
