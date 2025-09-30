# CCM WebUI 实现方案

## 项目概述

将现有的 CCM (Claude Code Manager) 命令行工具扩展为支持 WebUI 界面管理，提供可视化的 Claude Code API 配置管理能力。保留原有 CLI 功能的同时，通过 Web 界面提供更友好的操作体验。

## 一、功能需求分析

### 1.1 核心功能模块

#### 供应商管理
- **供应商列表展示**：以卡片或表格形式展示所有供应商配置
- **添加供应商**：通过表单快速添加新的 API 供应商
- **编辑供应商**：修改现有供应商的名称、URL、API Key 等信息
- **删除供应商**：删除不再使用的供应商配置
- **快速切换**：一键切换当前使用的供应商
- **批量导入/导出**：支持批量管理供应商配置

#### 状态监控
- **当前配置状态**：实时显示当前激活的供应商信息
- **Claude 配置路径**：显示 settings.json 文件路径
- **使用统计**：显示各供应商的使用频率和最后使用时间
- **连接测试**：测试供应商 API 的可用性

#### 配置管理
- **配置备份**：手动/自动备份配置文件
- **配置恢复**：从备份中恢复配置
- **配置同步**：支持配置的导入导出
- **环境切换**：开发/生产环境配置分离

#### 系统设置
- **界面语言**：支持中英文切换（利用现有 i18n）
- **主题切换**：亮色/暗色主题
- **访问控制**：设置访问密码保护
- **自动刷新**：配置状态自动刷新间隔

### 1.2 用户体验要求

- **响应式设计**：支持桌面和移动设备访问
- **实时反馈**：操作结果即时展示
- **错误处理**：友好的错误提示和恢复建议
- **操作确认**：危险操作需要二次确认
- **快捷操作**：支持键盘快捷键

## 二、技术架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────┐
│                   WebUI 层                       │
│  (React/Vue + Ant Design/Element UI)            │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│               WebSocket/REST API                 │
│              (实时通信 + RESTful)                 │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│                  API Server                      │
│         (Fastify/Express + TypeScript)           │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│              CCM Core Services                   │
│  (ProviderManager + ConfigManager + FileOps)     │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│               File System                        │
│    (~/.ccman/ + ~/.claude/settings.json)         │
└─────────────────────────────────────────────────┘
```

### 2.2 技术栈选择

#### 后端技术栈
- **Web 框架**: Fastify (复用 file-server 经验)
- **语言**: TypeScript (与现有代码保持一致)
- **API 设计**: RESTful + WebSocket
- **认证**: JWT Token + Session
- **文件操作**: fs-extra (已在使用)
- **进程管理**: PM2/Forever (生产环境)

#### 前端技术栈
- **框架**: React 18 + TypeScript
- **UI 组件**: Ant Design 5.x
- **状态管理**: Zustand/Redux Toolkit
- **构建工具**: Vite
- **样式**: TailwindCSS + CSS Modules
- **请求库**: Axios + SWR
- **WebSocket**: Socket.io-client

### 2.3 API 设计

#### RESTful API 端点

```typescript
// 供应商管理
GET    /api/providers              // 获取所有供应商
GET    /api/providers/current      // 获取当前供应商
POST   /api/providers              // 添加供应商
PUT    /api/providers/:id          // 更新供应商
DELETE /api/providers/:id          // 删除供应商
POST   /api/providers/:id/use      // 切换供应商
POST   /api/providers/:id/test     // 测试连接

// 配置管理
GET    /api/config                 // 获取配置信息
POST   /api/config/backup          // 备份配置
POST   /api/config/restore         // 恢复配置
POST   /api/config/export          // 导出配置
POST   /api/config/import          // 导入配置
DELETE /api/config/clear           // 清除所有配置

// 系统信息
GET    /api/system/stats           // 获取统计信息
GET    /api/system/health          // 健康检查
GET    /api/system/env             // 环境信息

// WebSocket 事件
ws://localhost:3000/ws
- provider:changed                 // 供应商切换事件
- config:updated                   // 配置更新事件
- file:modified                    // 文件修改事件
```

### 2.4 文件系统交互方案

#### 核心服务层改造

```typescript
// src/api/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ProviderManager } from '../providers/ProviderManager';
import { WebSocketService } from './websocket';

export class CCMApiServer {
  private server: FastifyInstance;
  private providerManager: ProviderManager;
  private wsService: WebSocketService;

  constructor() {
    this.server = Fastify({ logger: true });
    this.providerManager = new ProviderManager();
    this.wsService = new WebSocketService();
  }

  async start(port: number = 3000) {
    // 注册中间件
    await this.server.register(cors);

    // 注册路由
    this.registerRoutes();

    // 启动服务
    await this.server.listen({ port, host: '0.0.0.0' });
  }

  private registerRoutes() {
    // 供应商路由
    this.server.get('/api/providers', async () => {
      return await this.providerManager.listProviders();
    });

    this.server.post('/api/providers', async (request) => {
      return await this.providerManager.addProvider(request.body);
    });

    // ... 其他路由
  }
}
```

#### 文件监听服务

```typescript
// src/api/file-watcher.ts
import { watch } from 'fs-extra';
import { EventEmitter } from 'events';

export class FileWatcher extends EventEmitter {
  private watchers: Map<string, FSWatcher> = new Map();

  watchFile(path: string, callback: (event: string) => void) {
    const watcher = watch(path, (eventType, filename) => {
      callback(eventType);
      this.emit('file:changed', { path, eventType, filename });
    });

    this.watchers.set(path, watcher);
  }

  unwatchAll() {
    this.watchers.forEach(w => w.close());
    this.watchers.clear();
  }
}
```

## 三、file-server 项目复用分析

### 3.1 可复用组件

从 file-server 项目中可以复用以下部分：

1. **Fastify 服务器配置**
   - CORS 配置
   - Swagger 文档生成
   - 错误处理中间件
   - 认证中间件

2. **文件操作服务**
   - 文件读写逻辑
   - 路径处理工具
   - 权限检查机制

3. **API 响应格式**
   - 统一的响应结构
   - 错误码定义
   - 时间戳处理

4. **配置管理**
   - 环境变量处理
   - 配置文件加载

### 3.2 需要修改的部分

1. **路由定义**：适配 CCM 的业务逻辑
2. **认证机制**：简化为本地使用场景
3. **文件扫描**：改为配置文件监听
4. **数据模型**：使用 CCM 的类型定义

## 四、实施计划

### 第一阶段：后端 API 开发（1周）

1. **Day 1-2**: 搭建 API 服务器框架
   - 集成 Fastify 服务器
   - 设置 CORS 和中间件
   - 实现基础路由结构

2. **Day 3-4**: 实现核心 API
   - 供应商管理 API
   - 配置管理 API
   - 系统信息 API

3. **Day 5-6**: WebSocket 集成
   - 实时事件推送
   - 文件变化监听
   - 状态同步机制

4. **Day 7**: API 测试和文档
   - 单元测试
   - API 文档生成
   - Postman 集合

### 第二阶段：前端开发（1.5周）

1. **Day 1-2**: 项目初始化
   - Vite + React 项目搭建
   - Ant Design 集成
   - 路由配置

2. **Day 3-5**: 核心页面开发
   - 供应商列表页
   - 供应商编辑表单
   - 配置管理页面

3. **Day 6-7**: 实时功能
   - WebSocket 连接
   - 状态同步
   - 实时通知

4. **Day 8-10**: 优化和测试
   - 响应式适配
   - 错误处理
   - 用户体验优化

### 第三阶段：集成和部署（0.5周）

1. **Day 1-2**: 集成测试
   - 前后端联调
   - 功能测试
   - 性能优化

2. **Day 3**: 部署方案
   - Docker 容器化
   - 启动脚本
   - 文档编写

## 五、项目结构设计

```
ccm/
├── src/
│   ├── cli.ts                 # CLI 入口（保留）
│   ├── api/                   # API 服务器（新增）
│   │   ├── server.ts          # Fastify 服务器
│   │   ├── routes/            # API 路由
│   │   │   ├── providers.ts
│   │   │   ├── config.ts
│   │   │   └── system.ts
│   │   ├── middleware/        # 中间件
│   │   │   ├── auth.ts
│   │   │   └── error.ts
│   │   ├── services/          # API 服务
│   │   │   ├── websocket.ts
│   │   │   └── file-watcher.ts
│   │   └── index.ts          # API 入口
│   ├── web/                  # Web UI（新增）
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── pages/       # 页面组件
│   │   │   ├── components/  # 通用组件
│   │   │   ├── services/    # API 调用
│   │   │   ├── stores/      # 状态管理
│   │   │   └── utils/       # 工具函数
│   │   ├── vite.config.ts
│   │   └── package.json
│   ├── core/                # 核心逻辑（现有）
│   ├── providers/           # 供应商管理（现有）
│   └── types/              # 类型定义（现有）
├── scripts/
│   ├── start-web.sh        # 启动 WebUI
│   └── build-web.sh        # 构建 WebUI
└── package.json            # 更新依赖
```

## 六、关键技术实现

### 6.1 安全的文件操作

```typescript
// 使用文件锁防止并发写入
import { lock } from 'proper-lockfile';

export class SafeFileManager {
  async writeFileWithLock(path: string, content: string) {
    const release = await lock(path, { retries: 3 });
    try {
      await fs.writeJson(path, content, { spaces: 2 });
    } finally {
      await release();
    }
  }
}
```

### 6.2 配置变更通知

```typescript
// 配置变更时通知所有客户端
export class ConfigChangeNotifier {
  notifyChange(changeType: string, data: any) {
    // 通知 WebSocket 客户端
    this.wsService.broadcast('config:changed', { changeType, data });

    // 记录变更日志
    this.logger.info(`Config changed: ${changeType}`, data);
  }
}
```

### 6.3 CLI 与 WebUI 共存

```typescript
// package.json scripts
{
  "scripts": {
    "cli": "ts-node src/cli.ts",
    "web": "ts-node src/api/index.ts",
    "dev:web": "concurrently \"npm run web\" \"cd src/web && npm run dev\"",
    "build:web": "cd src/web && npm run build",
    "start": "node dist/cli.js",
    "start:web": "node dist/api/index.js"
  }
}
```

## 七、风险和挑战

### 7.1 技术风险

1. **文件并发访问**
   - 风险：CLI 和 WebUI 同时修改配置文件
   - 解决：使用文件锁机制，确保原子操作

2. **权限问题**
   - 风险：Web 服务可能无法访问用户目录
   - 解决：确保以当前用户身份运行服务

3. **跨平台兼容**
   - 风险：Windows/Mac/Linux 路径差异
   - 解决：使用 path 模块处理路径

### 7.2 安全考虑

1. **本地访问控制**
   - 默认只监听 localhost
   - 可选的密码保护
   - HTTPS 支持（自签名证书）

2. **敏感信息保护**
   - API Key 加密存储
   - 传输加密
   - 操作日志审计

## 八、扩展功能规划

### 未来版本功能

1. **v2.2.0 - 基础 WebUI**
   - 核心功能实现
   - 本地访问

2. **v2.3.0 - 增强功能**
   - 配置模板市场
   - 批量管理
   - 使用分析

3. **v2.4.0 - 协作功能**
   - 团队配置共享
   - 远程访问支持
   - 配置同步服务

## 九、总结

本方案通过渐进式改造，在保留现有 CLI 功能的基础上，增加 WebUI 管理界面。充分复用 file-server 项目的技术积累，同时保持与现有 CCM 核心逻辑的兼容性。整体架构清晰，实施风险可控，能够显著提升用户体验。

### 核心优势

1. **零侵入改造**：不影响现有 CLI 功能
2. **技术复用**：最大化利用已有代码
3. **渐进式实施**：分阶段交付，降低风险
4. **用户友好**：可视化界面，降低使用门槛
5. **扩展性强**：为未来功能预留空间

### 预期成果

- 提供完整的 WebUI 配置管理界面
- 实现 CLI 和 WebUI 的无缝切换
- 支持实时状态同步和监控
- 提升配置管理的效率和体验