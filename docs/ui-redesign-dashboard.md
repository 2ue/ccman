# ccman Desktop UI 重设计方案

## 版本信息

- **方案版本**: v1.0
- **创建日期**: 2025-01-12
- **设计目标**: 重新设计 Desktop UI，采用 Dashboard + 小侧边栏的渐进式导航模式

---

## 一、设计理念

### 核心思想：渐进式导航

**传统方案的问题**：
- 8 个扁平 Tab 导航，功能层级混杂
- 缺少视觉分组，认知负荷高
- 侧边栏永久占用空间（220px）

**新方案的优势**：
- Dashboard 首页：大卡片式导航，信息密度高，一屏看全
- 详情页：小侧边栏（60px），内容区最大化
- 渐进式交互：首页概览 → 详情深入 → 快速切换

---

## 二、信息架构

### 功能分组

```
ccman
├─ 📊 Dashboard（首页）
│  ├─ Claude Code 卡片
│  ├─ Codex 卡片
│  ├─ MCP 服务器卡片
│  ├─ 预置服务商卡片
│  ├─ 清理工具卡片
│  └─ 设置 & 关于卡片
│
├─ ⚙️ 详情页（带小侧边栏）
│  ├─ Claude Code 管理
│  ├─ Codex 管理
│  ├─ MCP 管理
│  ├─ 预置服务商管理
│  ├─ 清理工具
│  ├─ 设置
│  └─ 关于
```

### 用户流程

```
启动应用
    ↓
┌─────────────┐
│ Dashboard   │  ← 查看所有功能状态
│ 6个卡片      │
└─────────────┘
    ↓ 点击卡片
┌───┬─────────┐
│← │详情页    │  ← 小侧边栏出现
│⚡│         │
│💻│         │  ← 可快速切换其他页面
│🔌│         │
└───┴─────────┘
    ↑ 点击返回
    └─ 回到 Dashboard
```

---

## 三、UI 布局规范

### 3.1 Dashboard 首页

#### 整体布局

```
┌────────────────────────────────────────────┐
│  ccman                      [最小化][关闭]   │
├────────────────────────────────────────────┤
│                                            │
│           🎯 ccman                         │
│      AI 服务商配置管理工具                   │
│                                            │
│   ┌──────────────┐   ┌──────────────┐    │
│   │  ⚡ Claude    │   │  💻 Codex     │    │
│   │    Code      │   │              │    │
│   │  ✅ OpenAI    │   │  ⚠️ 未配置     │    │
│   │  5 个服务商   │   │  3 个服务商    │    │
│   └──────────────┘   └──────────────┘    │
│                                            │
│   ┌──────────────┐   ┌──────────────┐    │
│   │ 🔌 MCP       │   │ 📦 预置       │    │
│   │   服务器      │   │   服务商      │    │
│   │ 3 个服务器    │   │ 13 个模板     │    │
│   └──────────────┘   └──────────────┘    │
│                                            │
│   ┌──────────────┐   ┌──────────────┐    │
│   │ 🗑️ 清理      │   │ ⚙️ 设置       │    │
│   │   工具        │   │   & 关于      │    │
│   │ 可释放 200MB  │   │ v3.0.27      │    │
│   └──────────────┘   └──────────────┘    │
│                                            │
└────────────────────────────────────────────┘
```

#### 卡片规格

**尺寸**：
- 卡片宽度：380px
- 卡片高度：160px
- 卡片间距：24px
- 布局：2 列 3 行网格
- 容器最大宽度：840px（居中）

**卡片结构**：
```
┌──────────────────────────┐
│ [状态角标]                │  ← 右上角状态标识
│                          │
│ [图标] 标题               │  ← 左侧大图标 + 标题
│                          │
│ • 状态信息行1             │  ← 2-3行状态信息
│ • 状态信息行2             │
│                          │
│         [进入 →]          │  ← Hover 显示
└──────────────────────────┘
```

**状态类型**：
- `success`: 绿色（已激活/已配置）
- `warning`: 黄色（未配置/需注意）
- `error`: 红色（错误/离线）
- `info`: 蓝色（正常/信息）

**交互效果**：
- Hover: 缩放 1.02 + 阴影
- 点击: 进入对应详情页
- 动画: 200ms 过渡

---

### 3.2 小侧边栏

#### 布局结构

```
┌───┬──────────────────────┐
│ ← │ 页面标题              │
│   ├──────────────────────┤
│   │                      │
│ ⚡ │                      │  ← Claude Code（激活）
│   │                      │
│ 💻 │     内容区            │
│   │                      │
│ 🔌 │                      │
│   │                      │
│ 📦 │                      │
│   │                      │
│ 🗑️ │                      │
│   │                      │
│   │                      │
│   │                      │
│ ⚙️ │                      │
│ ℹ️ │                      │
└───┴──────────────────────┘
 ↑
 60px 宽
```

#### 规格参数

**尺寸**：
- 宽度：60px
- 图标：24x24px
- 按钮：48x48px
- 间距：图标间 4px

**配色**（深色主题）：
- 背景：`bg-gray-900`
- 图标（未激活）：`text-gray-400`
- 图标（Hover）：`text-white` + `bg-gray-800`
- 图标（激活）：`text-white` + `bg-blue-600`
- 分隔线：`bg-gray-700`

**图标映射**：
```typescript
{
  home: Home,          // 返回 Dashboard
  claude: Sparkles,    // Claude Code
  codex: Terminal,     // Codex
  mcp: Server,         // MCP 服务器
  presets: Package,    // 预置服务商
  clean: Trash2,       // 清理工具
  settings: Settings,  // 设置
  about: Info,         // 关于
}
```

#### 布局结构

**顶部区域**（固定）：
- 返回按钮：← Home
- 分隔线

**中部区域**（滚动）：
- Claude Code
- Codex
- MCP
- 预置服务商
- 清理工具

**底部区域**（固定）：
- 弹性空间（flex-1）
- 设置
- 关于

#### 交互行为

**显示/隐藏**：
- Dashboard 页面：隐藏
- 详情页：显示（从左滑入动画，200ms）

**Hover 效果**：
- 显示 Tooltip（右侧，8px 偏移）
- 背景变化：`hover:bg-gray-800`
- 文字颜色：`hover:text-white`

**激活状态**：
- 背景：`bg-blue-600`
- 文字：`text-white`
- 圆角：`rounded-lg`

---

## 四、组件设计

### 4.1 DashboardCard 组件

**职责**：显示功能模块的状态卡片

**Props**：
```typescript
interface DashboardCardProps {
  icon: LucideIcon          // 图标
  title: string             // 标题
  statusLines: string[]     // 状态信息（2-3行）
  statusType: 'success' | 'warning' | 'error' | 'info'
  onClick: () => void       // 点击进入
}
```

**文件位置**：
```
packages/desktop/src/renderer/components/DashboardCard.tsx
```

---

### 4.2 DashboardPage 组件

**职责**：Dashboard 首页，渲染所有功能卡片

**Props**：
```typescript
interface DashboardPageProps {
  tools: Record<ToolType, ToolData>  // 工具数据
  onEnterPage: (key: NavKey) => void // 进入详情页
}
```

**数据来源**：
- Claude/Codex 当前服务商
- Claude/Codex 服务商数量
- MCP 服务器信息
- 预置服务商数量
- 清理工具统计

**文件位置**：
```
packages/desktop/src/renderer/components/DashboardPage.tsx
```

---

### 4.3 MiniSidebar 组件

**职责**：小侧边栏导航，快速切换页面

**Props**：
```typescript
interface MiniSidebarProps {
  activeKey: NavKey               // 当前激活页
  onNavigate: (key: NavKey) => void // 导航切换
}
```

**依赖**：
- `@radix-ui/react-tooltip`（Tooltip 提示）
- `lucide-react`（图标）

**文件位置**：
```
packages/desktop/src/renderer/components/MiniSidebar.tsx
```

---

### 4.4 App.tsx 主逻辑

**状态管理**：
```typescript
const [currentView, setCurrentView] = useState<'dashboard' | NavKey>('dashboard')
const [tools, setTools] = useState<Record<ToolType, ToolData>>({ ... })
```

**导航逻辑**：
```typescript
// 从 Dashboard 进入详情页
const handleEnterPage = (key: NavKey) => {
  setCurrentView(key)
}

// 小侧边栏导航
const handleNavigate = (key: NavKey) => {
  if (key === 'home') {
    setCurrentView('dashboard')
  } else {
    setCurrentView(key)
  }
}
```

**布局结构**：
```tsx
<div className="flex h-screen">
  {/* 小侧边栏（仅详情页） */}
  {currentView !== 'dashboard' && (
    <MiniSidebar activeKey={currentView} onNavigate={handleNavigate} />
  )}

  {/* 主内容区 */}
  <div className="flex-1">
    {currentView === 'dashboard' && (
      <DashboardPage tools={tools} onEnterPage={handleEnterPage} />
    )}
    {currentView === 'claude' && <ClaudeCodePage ... />}
    {/* ... 其他页面 */}
  </div>
</div>
```

---

## 五、技术栈

### 核心依赖

- **React 18**: UI 框架
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式
- **lucide-react**: 图标库（已引入）
- **@radix-ui/react-tooltip**: Tooltip 组件

### 新增依赖

需要安装：
```bash
pnpm add @radix-ui/react-tooltip
```

### 可选依赖

如需动画效果：
```bash
pnpm add framer-motion
```

---

## 六、实施计划

### Phase 1: 核心组件（2-3 小时）

**任务清单**：
- [x] 创建设计文档
- [ ] 安装依赖（@radix-ui/react-tooltip）
- [ ] 创建 DashboardCard 组件
- [ ] 创建 DashboardPage 组件
- [ ] 创建 MiniSidebar 组件

**验收标准**：
- 组件可独立渲染
- Props 类型定义完整
- 样式符合设计规范

---

### Phase 2: 主逻辑整合（1-2 小时）

**任务清单**：
- [ ] 修改 App.tsx 状态管理
- [ ] 实现导航逻辑（Dashboard ↔️ 详情页）
- [ ] 集成小侧边栏（条件渲染）
- [ ] 保持现有页面组件不变

**验收标准**：
- Dashboard → 详情页：点击卡片进入
- 详情页 → Dashboard：点击返回
- 详情页 ↔️ 详情页：小侧边栏切换
- 所有现有功能正常工作

---

### Phase 3: 优化细节（1-2 小时）

**任务清单**：
- [ ] 添加进入/退出动画
- [ ] 完善 Tooltip 提示
- [ ] 优化 Hover 效果
- [ ] 添加键盘快捷键（可选）

**验收标准**：
- 小侧边栏滑入动画流畅
- Tooltip 显示正确
- 交互反馈清晰

---

### Phase 4: 测试（1 小时）

**测试场景**：
1. **导航测试**：
   - Dashboard 点击每个卡片，进入对应页面
   - 小侧边栏点击每个图标，正确切换
   - 点击返回，回到 Dashboard

2. **功能测试**：
   - Claude Code：添加、编辑、删除、切换服务商
   - Codex：同上
   - MCP：管理 MCP 服务器
   - 预置：使用预置添加服务商
   - 清理：清理历史数据
   - 设置：修改配置

3. **状态同步测试**：
   - Dashboard 卡片显示正确状态
   - 切换服务商后，Dashboard 状态更新

**验收标准**：
- 所有功能正常
- 无 console 错误
- 交互流畅

---

## 七、与旧方案的对比

### 对比表

| 维度 | 新方案（Dashboard + 小侧边栏） | 旧方案（顶部 Tab） |
|------|----------------------------|------------------|
| 首屏信息 | ⭐⭐⭐⭐⭐ 6个卡片，信息丰富 | ⭐⭐⭐ 仅标题 |
| 内容空间 | ⭐⭐⭐⭐⭐ 小侧边栏 60px | ⭐⭐⭐⭐ 无侧边栏 |
| 导航效率 | ⭐⭐⭐⭐ 需要返回 Dashboard | ⭐⭐⭐ 顶部 Tab 切换 |
| 视觉分组 | ⭐⭐⭐⭐⭐ 卡片分组清晰 | ⭐⭐ 8个扁平 Tab |
| 扩展性 | ⭐⭐⭐⭐⭐ 添加卡片容易 | ⭐⭐⭐ Tab 拥挤 |
| 现代感 | ⭐⭐⭐⭐⭐ 非常现代 | ⭐⭐⭐ 传统 |

### 优势

1. **信息密度高**：Dashboard 卡片可展示状态、统计
2. **沉浸式体验**：详情页内容区最大化
3. **视觉清晰**：卡片分组，一目了然
4. **易于扩展**：添加新功能只需加卡片

### 权衡

1. **多一次点击**：需要返回 Dashboard 再进入其他页（但小侧边栏可直接切换）
2. **学习成本**：用户需要适应新的导航方式（但更直观）

---

## 八、未来优化

### 可选功能

1. **首次使用引导**：
   - 高亮小侧边栏
   - 提示"点击图标快速切换"

2. **键盘快捷键**：
   - `Cmd/Ctrl + H`：返回 Dashboard
   - `Cmd/Ctrl + 1-6`：快速切换页面

3. **卡片动态排序**：
   - 根据使用频率自动调整卡片顺序
   - 用户自定义卡片位置

4. **Dashboard 搜索**：
   - 快速搜索功能/服务商
   - 全局搜索框

5. **小侧边栏自定义**：
   - 用户可调整图标顺序
   - 隐藏不常用的页面

---

## 九、设计决策记录

### 为什么选择 Dashboard + 小侧边栏？

**问题**：8 个扁平 Tab 导航混乱

**考虑的方案**：
1. 传统侧边栏（220px，永久显示）
2. 顶部 Tab + 二级导航
3. **Dashboard + 小侧边栏（最终选择）**

**选择理由**：
- ✅ 信息密度最高
- ✅ 内容区空间最大
- ✅ 符合现代应用设计趋势
- ✅ 功能模块独立性强，适合这种导航方式

---

### 为什么小侧边栏是 60px？

**考虑的宽度**：
- 48px：太窄，图标拥挤
- 60px：**最佳**，图标舒适，空间利用好
- 80px：稍宽，占用空间多

**最终选择**：60px
- 图标 24x24px
- 左右 padding 18px
- 总宽度 60px

---

### 为什么使用 @radix-ui/react-tooltip？

**需求**：小侧边栏纯图标，需要 Tooltip 提示

**选择理由**：
- ✅ 无头组件，样式可控
- ✅ 支持键盘导航、无障碍
- ✅ 轻量级（~10KB）
- ✅ 与 lucide-react 搭配良好

**备选方案**：
- ❌ 纯 CSS Tooltip：交互受限
- ❌ react-tooltip：体积大，样式难定制

---

## 十、总结

### 核心改进

**导航结构**：
- 旧：8 个扁平 Tab
- 新：Dashboard（6 卡片）+ 小侧边栏（7 图标）

**信息架构**：
- 旧：功能层级混杂
- 新：首页概览 → 详情操作

**空间利用**：
- 旧：顶部 Tab 48px
- 新：Dashboard 全屏 / 详情页 60px 侧边栏

### 预期效果

**用户反馈**：
- "页面不再混乱"
- "功能一目了然"
- "操作更流畅"

**开发收益**：
- 代码结构更清晰
- 扩展性更好
- 维护成本更低

---

## 附录

### A. 组件文件清单

```
packages/desktop/src/renderer/components/
├── DashboardCard.tsx        # 新增：功能卡片
├── DashboardPage.tsx        # 新增：Dashboard 首页
├── MiniSidebar.tsx          # 新增：小侧边栏
├── ClaudeCodePage.tsx       # 保持不变
├── CodexPage.tsx            # 保持不变
├── MCPManagerPage.tsx       # 保持不变
├── ServiceProviderConfigPage.tsx  # 保持不变
├── CleanPage.tsx            # 保持不变
├── SettingsPage.tsx         # 保持不变
└── AboutPage.tsx            # 保持不变
```

### B. 类型定义

```typescript
// 导航键
export type NavKey =
  | 'home'       // 返回 Dashboard
  | 'claude'     // Claude Code
  | 'codex'      // Codex
  | 'mcp'        // MCP 服务器
  | 'presets'    // 预置服务商
  | 'clean'      // 清理工具
  | 'settings'   // 设置
  | 'about'      // 关于

// 视图状态
export type ViewState = 'dashboard' | NavKey

// 工具数据
export interface ToolData {
  providers: Provider[]
  current?: Provider
  presetsCount: number
}
```

### C. 相关文档

- [CLAUDE.md](../CLAUDE.md) - 项目开发规范
- [技术架构.md](./技术架构.md) - Core 层设计
- [功能清单.md](./功能清单.md) - 功能范围

---

**文档维护**：本文档将随着实施进展持续更新
