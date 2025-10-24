# WebDAV 同步功能分析

## 📋 文档说明

本文档分析 ccman 的 WebDAV 同步功能现状，说明 CLI 和 Desktop 的功能实现。

**版本**: v3.0.20+
**最后更新**: 2025-10-25

---

## 🎯 功能概述

### 核心价值

WebDAV 同步为 ccman 提供跨设备配置同步能力：

1. **跨设备同步**：在多台电脑间自动同步配置（包括 API Key）
2. **自动备份**：配置自动加密备份到云端，防止丢失
3. **团队协作**：团队成员共享统一的服务商配置

### 与导出导入的区别

| 功能 | WebDAV 同步 | 导出导入 |
|------|------------|----------|
| **操作方式** | 自动/手动 | 纯手动 |
| **API Key** | 加密存储 | 可选包含（不加密） |
| **适用场景** | 多设备持续同步 | 一次性迁移/备份 |
| **安全性** | AES-256-GCM 加密 | 文件权限保护 |
| **复杂度** | 高（需配置 WebDAV） | 低（直接导出文件） |

---

## 🏗️ 技术架构

### 数据结构

#### 1. 本地配置（`~/.ccman/codex.json`）

```typescript
interface ToolConfig {
  currentProviderId?: string
  providers: Provider[]
  presets?: Preset[]
  // ... 其他字段
}

interface Provider {
  id: string
  name: string
  baseUrl: string
  apiKey: string           // 明文存储（本地文件权限 0600 保护）
  createdAt: number
  lastModified: number     // 用于同步冲突解决
  lastUsedAt?: number
}

interface Preset {
  name: string
  baseUrl: string
  description: string
}
```

#### 2. 云端配置（WebDAV 存储）

```typescript
interface EncryptedToolConfig {
  currentProviderId?: string
  providers: EncryptedProvider[]
  presets?: Preset[]  // 用户自定义预设（不加密）
  // ... 其他字段（使用扩展运算符自动同步）
}

interface EncryptedProvider {
  id: string
  name: string
  baseUrl: string
  encryptedApiKey: string  // AES-256-GCM 加密
  createdAt: number
  lastModified: number
  lastUsedAt?: number
}
```

**加密格式**：
```
encryptedApiKey = Base64([salt(32)][iv(16)][tag(16)][encrypted(n)])
```

**加密算法**：
- **算法**：AES-256-GCM（认证加密）
- **密钥派生**：PBKDF2-SHA256（100,000 轮迭代）
- **盐值**：32 字节随机生成
- **IV**：16 字节随机生成
- **认证标签**：16 字节 GCM 标签

#### 3. WebDAV 配置（`~/.ccman/config.json` 的 sync 部分）

```typescript
interface SyncConfig {
  webdavUrl: string        // WebDAV 服务器地址
  username: string         // 用户名
  password: string         // WebDAV 认证密码（明文，文件权限 0600）
  authType?: 'password' | 'digest'  // 认证类型（默认 password = Basic Auth）
  remoteDir?: string       // 远程目录（默认 /）
  syncPassword?: string    // 同步密码（可选存储，用于加密 API Key）
  rememberSyncPassword?: boolean  // 是否记住同步密码
  lastSync?: number        // 最后同步时间
}
```

**注意**：
- `password`：WebDAV 账号密码（用于连接服务器）
- `syncPassword`：同步密码（用于加密/解密 API Key）
- **两者不是同一个密码**

### 模块设计

```
packages/core/src/sync/
├── types.ts                 # 类型定义
├── crypto.ts                # AES-256-GCM 加密/解密
├── webdav-client.ts         # WebDAV 客户端封装
├── merge-advanced.ts        # 智能合并逻辑（providers + presets）
├── merge.ts                 # 备份恢复工具
└── sync-v2.ts               # 三种同步模式

packages/cli/src/commands/sync/
├── index.ts                 # 交互式菜单
├── config.ts                # 配置 WebDAV
├── test.ts                  # 测试连接
├── upload.ts                # 上传到云端
├── download.ts              # 从云端下载
├── merge.ts                 # 智能合并
└── status.ts                # 查看同步状态

packages/cli/src/utils/
└── sync-config.ts           # 配置管理工具（统一读写）

packages/desktop/src/renderer/components/settings/
└── WebDAVSyncSection.tsx    # Desktop 同步界面
```

---

## 🔄 三种同步模式

### 模式 1：上传到云端（Upload）

**用途**：本地配置覆盖云端

**流程**：
```
本地配置 → 加密 API Key → 上传到 WebDAV
```

**特点**：
- ✅ 强制覆盖云端
- ✅ 加密 API Key（使用同步密码）
- ✅ 同步所有配置字段（providers、presets、currentProviderId 等）
- ⚠️ 不检查云端是否有更新

**实现**：
```typescript
// 使用扩展运算符保留所有字段
const encryptedCodexConfig = {
  ...codexConfig,  // 自动包含所有字段
  providers: encryptedCodexProviders,  // 只替换 providers（加密后）
}

await uploadToWebDAV(config, CODEX_REMOTE_PATH, JSON.stringify(encryptedCodexConfig))
```

### 模式 2：从云端下载（Download）

**用途**：云端配置覆盖本地

**流程**：
```
WebDAV → 解密 API Key → 备份本地 → 覆盖本地配置 → 自动应用当前 provider
```

**特点**：
- ✅ 强制覆盖本地
- ✅ 自动备份（失败时回滚）
- ✅ 同步所有配置字段（providers、presets、currentProviderId 等）
- ✅ 自动应用 currentProviderId（调用 `writeCodexConfig` / `writeClaudeConfig`）
- ⚠️ 不检查本地是否有更新

**实现**：
```typescript
// 使用云端所有字段
const newCodexConfig = {
  ...remoteCodexConfig,  // 使用云端所有字段（包括 presets）
  providers: decryptedCodexProviders,  // 只替换 providers（解密后）
}

writeJSON(codexConfigPath, newCodexConfig)

// 自动应用当前 provider
applyCurrentProvider('codex', newCodexConfig)
```

### 模式 3：智能合并（Merge）

**用途**：合并本地和云端配置，双向同步

**流程**：
```
下载云端 → 解密 → 智能合并（按 lastModified） → 写入本地 → 加密上传
```

**Providers 合并规则**：

| 场景 | 处理逻辑 |
|------|----------|
| 相同 id | 比较 lastModified，保留最新的 |
| 相同配置（baseUrl + apiKey） | 合并为一个，保留最新的 |
| 不同 id 且不同配置 | 都保留，自动解决 name 冲突 |
| name 冲突 | 重命名为 `name_2`, `name_3` ... |

**Presets 合并规则**：

| 场景 | 处理逻辑 |
|------|----------|
| 相同 preset（name + baseUrl） | 去重，只保留一个 |
| name 相同但 baseUrl 不同 | 重命名为 `name_2`, `name_3` ... |
| 不同 preset | 都保留 |

**特点**：
- ✅ 智能合并，不丢失任何数据
- ✅ 自动解决 name 冲突（providers 和 presets）
- ✅ 同步所有配置字段
- ✅ 双向同步（本地 ↔ 云端）

**实现**：
```typescript
// 智能合并 providers
const codexMergeResult = mergeProviders(
  localCodexConfig.providers,
  remoteCodexProviders
)

// 智能合并 presets
const mergedCodexPresets = mergePresets(
  localCodexConfig.presets,
  remoteCodexConfig?.presets
)

// 构建合并后的配置
const mergedCodexConfig = {
  ...localCodexConfig,  // 保留本地所有字段
  providers: codexMergeResult.merged,  // 替换为合并后的 providers
  presets: mergedCodexPresets,  // 替换为合并后的 presets
}

// 上传到云端
const encryptedCodexConfig = {
  ...mergedCodexConfig,  // 保留所有字段
  providers: encryptedCodexProviders,  // 只替换 providers（加密后）
}

await uploadToWebDAV(config, CODEX_REMOTE_PATH, JSON.stringify(encryptedCodexConfig))
```

---

## 🔐 安全性设计

### 1. API Key 加密

**加密流程**：
```typescript
// 1. 从密码派生密钥
salt = randomBytes(32)
key = PBKDF2(password, salt, 100000, 'sha256')

// 2. 加密 API Key
iv = randomBytes(16)
cipher = createCipheriv('aes-256-gcm', key, iv)
encrypted = cipher.update(apiKey) + cipher.final()
tag = cipher.getAuthTag()

// 3. 组合数据
result = Base64(salt + iv + tag + encrypted)
```

**解密流程**：
```typescript
// 1. 解码并提取各部分
data = Base64.decode(encryptedApiKey)
salt = data[0:32]
iv = data[32:48]
tag = data[48:64]
encrypted = data[64:]

// 2. 派生密钥
key = PBKDF2(password, salt, 100000, 'sha256')

// 3. 解密
decipher = createDecipheriv('aes-256-gcm', key, iv)
decipher.setAuthTag(tag)
apiKey = decipher.update(encrypted) + decipher.final()
```

### 2. 密码安全

**两层密码**：
1. **WebDAV 认证密码**（`config.password`）：
   - 用于连接 WebDAV 服务器
   - 明文存储在 `~/.ccman/config.json`
   - 文件权限 `0600`（仅所有者可读）

2. **同步密码**（`syncPassword`）：
   - 用于加密/解密 API Key
   - **可选存储**（用户选择）
   - 如果不存储，每次同步时提示输入

**CLI 和 Desktop 统一架构**：
- ✅ 都使用明文存储 WebDAV 密码
- ✅ 都依赖文件权限 0600 保护
- ✅ 都支持可选存储同步密码
- ✅ 只有 API Key 加密（存储在云端）

### 3. 文件权限

**本地配置文件**：
```bash
~/.ccman/
├── codex.json          # 0600 (rw-------)
├── claude.json         # 0600 (rw-------)
└── config.json         # 0600 (rw-------)
```

**WebDAV 云端**：
- 使用 HTTPS 连接（TLS 加密传输）
- API Key 已加密，即使 WebDAV 泄露也无法解密

### 4. 错误恢复

**备份策略**：
```
~/.ccman/
├── codex.json
├── codex.json.backup.1729758000  # 时间戳备份
├── codex.json.backup.1729758100
└── codex.json.backup.1729758200  # 最多保留 3 个备份
```

**回滚机制**：
1. 操作前自动备份
2. 操作失败时自动恢复备份
3. 原子操作（write temp + rename）

---

## 💻 CLI 命令

### 1. 配置 WebDAV

```bash
ccman sync config
```

**交互流程**：
```
⚙️  配置 WebDAV 连接

WebDAV 服务器地址: https://dav.example.com
用户名: your-username
密码: ********
认证类型 (password/digest): password
远程目录 (默认 /): /ccman

💾 是否保存同步密码到本地？
  ⚠️  不保存：每次同步时输入密码（更安全）
  ✅ 保存：自动同步无需输入（便捷但风险高）

选择 (Y/n): n

✅ 配置保存成功
```

### 2. 测试连接

```bash
ccman sync test
```

**输出**：
```
🔍 测试 WebDAV 连接...

✅ 连接成功
服务器: https://dav.example.com
远程目录: /ccman
```

### 3. 上传到云端

```bash
ccman sync upload
```

**输出**：
```
📤 上传配置到云端

本地配置将覆盖云端配置

🔐 请输入同步密码（用于加密 API Key）:
密码: ********

🔒 加密 API Key...
📤 上传 Codex 配置...
📤 上传 Claude 配置...

✅ 配置已上传到云端
```

### 4. 从云端下载

```bash
ccman sync download
```

**输出**：
```
📥 从云端下载配置

云端配置将覆盖本地配置
⚠️  将自动备份本地配置

确认下载? (Y/n): y

🔐 请输入同步密码（用于解密 API Key）:
密码: ********

💾 备份本地配置...
📥 下载远程配置...
🔓 解密 API Key...
✅ 配置已从云端下载并应用

📝 已自动应用当前 provider:
  - Codex: anthropic
  - Claude: openai
```

### 5. 智能合并

```bash
ccman sync merge
```

**输出**：
```
🔄 智能合并本地和云端配置

🔐 请输入同步密码:
密码: ********

📥 下载云端配置...
🔓 解密 API Key...
🧠 智能合并中...

📊 合并结果：
  Codex:
    - 保留本地 provider: anthropic (本地更新)
    - 添加远程 provider: openai (新增)
    - name 冲突：将 "test" 重命名为 "test_2"
  Claude:
    - 无变化

💾 备份本地配置...
✅ 配置已合并并同步到云端
```

### 6. 查看同步状态

```bash
ccman sync status
```

**输出**：
```
📊 同步状态

WebDAV 配置:
  服务器: https://dav.example.com
  用户名: your-username
  远程目录: /ccman
  同步密码: ✅ 已保存 / ❌ 未保存

本地配置:
  Codex: 2 个 providers
  Claude: 3 个 providers
  最后同步: 2025-10-25 10:30:45
```

---

## 🖥️ Desktop 界面

### 位置

**设置 → WebDAV 同步**（`packages/desktop/src/renderer/components/settings/WebDAVSyncSection.tsx`）

### 功能界面

```
┌─────────────────────────────────────────┐
│ 📤 WebDAV 同步                           │
├─────────────────────────────────────────┤
│ WebDAV 服务器地址:                       │
│ [https://dav.example.com____________]   │
│                                          │
│ 用户名:                                  │
│ [your-username____________________]     │
│                                          │
│ 密码:                                    │
│ [********_________________________]     │
│                                          │
│ 认证类型:                                │
│ ○ Basic Auth  ○ Digest Auth             │
│                                          │
│ 远程目录:                                │
│ [/ccman_________________________]       │
│                                          │
│ 同步密码:                                │
│ [********_________________________]     │
│                                          │
│ □ 记住同步密码                           │
│                                          │
│ [保存配置]  [测试连接]                   │
├─────────────────────────────────────────┤
│ 同步操作:                                │
│                                          │
│ [📤 上传到云端]                          │
│ 将本地配置上传到 WebDAV 服务器           │
│                                          │
│ [📥 从云端下载]                          │
│ 从 WebDAV 下载配置到本地                 │
│                                          │
│ [🔄 智能合并]                            │
│ 合并本地和云端配置                       │
└─────────────────────────────────────────┘
```

### 交互逻辑

1. **配置保存**：
   - 表单验证（URL 格式、必填字段）
   - 保存到 `~/.ccman/config.json`
   - 密码明文存储（文件权限 0600）

2. **测试连接**：
   - 使用配置连接 WebDAV
   - 显示连接结果（成功/失败）

3. **同步操作**：
   - 上传：直接调用 `uploadToCloud()`
   - 下载：直接调用 `downloadFromCloud()`
   - 合并：直接调用 `mergeSync()`
   - 显示操作结果和详细信息

### 实现细节

```typescript
// Desktop 主进程 IPC 处理器
ipcMain.handle('sync.saveSyncConfig', async (event, config) => {
  saveSyncConfig(config)  // 直接调用 core
})

ipcMain.handle('sync.uploadToCloud', async (event, config, password) => {
  return await uploadToCloud(config, password)  // 直接调用 core
})

ipcMain.handle('sync.downloadFromCloud', async (event, config, password) => {
  return await downloadFromCloud(config, password)  // 直接调用 core
})

ipcMain.handle('sync.mergeSync', async (event, config, password) => {
  return await mergeSync(config, password)  // 直接调用 core
})
```

---

## ⚖️ CLI vs Desktop 功能对比

| 功能 | CLI | Desktop | 实现 |
|------|-----|---------|------|
| **配置 WebDAV** | ✅ `sync config` | ✅ 表单配置 | 都直接调用 `core/config.ts` |
| **测试连接** | ✅ `sync test` | ✅ 测试按钮 | 都调用 `testWebDAVConnection()` |
| **上传到云端** | ✅ `sync upload` | ✅ 上传按钮 | 都调用 `uploadToCloud()` |
| **从云端下载** | ✅ `sync download` | ✅ 下载按钮 | 都调用 `downloadFromCloud()` |
| **智能合并** | ✅ `sync merge` | ✅ 合并按钮 | 都调用 `mergeSync()` |
| **查看状态** | ✅ `sync status` | ✅ 状态显示 | CLI: 命令行输出 / Desktop: UI 显示 |
| **密码管理** | ✅ 明文存储（0600） | ✅ 明文存储（0600） | 统一架构 |
| **API Key 加密** | ✅ AES-256-GCM | ✅ AES-256-GCM | 都调用 `crypto.ts` |
| **Providers 同步** | ✅ 完整同步 | ✅ 完整同步 | 都使用扩展运算符 |
| **Presets 同步** | ✅ 完整同步 | ✅ 完整同步 | 都使用 `mergePresets()` |
| **自动备份** | ✅ 自动备份 | ✅ 自动备份 | 都调用 `backupConfig()` |
| **错误回滚** | ✅ 自动回滚 | ✅ 自动回滚 | 统一错误处理 |
| **操作确认** | ✅ inquirer 提示 | ⚠️ 缺少确认对话框 | 差异点 |
| **进度反馈** | ✅ 命令行输出 | ⚠️ 简单状态 | 差异点 |

### 能力一致性

**✅ 完全一致的功能**：
- WebDAV 配置管理
- 三种同步模式（Upload/Download/Merge）
- API Key 加密算法（AES-256-GCM）
- Providers 和 Presets 同步策略
- 自动备份和错误回滚
- 密码存储方式（明文 + 文件权限 0600）

**⚠️ 体验差异（非功能差异）**：
- **操作确认**：CLI 有确认提示，Desktop 直接执行
- **进度反馈**：CLI 详细输出，Desktop 简单状态
- **状态查询**：CLI 专门命令，Desktop 界面显示

**核心结论**：CLI 和 Desktop 的**同步功能完全一致**，都直接调用 `@ccman/core` 的同步模块，只是交互方式不同（命令行 vs 图形界面）。

---

## 🌐 支持的 WebDAV 服务

### 1. 坚果云（推荐）

**配置**：
```
URL: https://dav.jianguoyun.com/dav/
用户名: 邮箱
密码: 应用密码（不是登录密码）
认证类型: password
```

**优点**：
- ✅ 国内访问快
- ✅ 免费 1GB 空间
- ✅ 稳定性好

### 2. Nextcloud / ownCloud

**配置**：
```
URL: https://your-nextcloud.com/remote.php/webdav/
用户名: 用户名
密码: 密码
认证类型: password
```

**优点**：
- ✅ 自托管，完全掌控
- ✅ 无限空间
- ✅ 开源免费

### 3. Dropbox

**配置**：
```
URL: https://dav.dropbox.com/
用户名: Dropbox 账号
密码: App password
认证类型: password
```

### 4. Box.com

**配置**：
```
URL: https://dav.box.com/dav/
用户名: 邮箱
密码: 密码
认证类型: password
```

### 5. iCloud Drive

**配置**：
```
URL: https://icloud.com/
用户名: Apple ID
密码: App-specific password
认证类型: password
```

**限制**：
- 需要在 Apple ID 设置中生成"应用专用密码"
- 不支持根目录，必须指定 remoteDir

---

## 📊 同步字段说明

### 完整同步的字段

| 字段 | 类型 | 云端存储 | 说明 |
|------|------|----------|------|
| `currentProviderId` | string | 明文 | 当前使用的 provider ID |
| `providers` | Provider[] | **加密** | 服务商列表（API Key 加密） |
| `presets` | Preset[] | 明文 | 用户自定义预设模板 |
| `lastUsedAt` | number | 明文 | 最后使用时间（provider 级别） |
| `createdAt` | number | 明文 | 创建时间（provider 级别） |
| `lastModified` | number | 明文 | 最后修改时间（用于冲突解决） |

### 只加密的字段

- ✅ `apiKey`（Provider 的 API Key）
- ❌ 其他所有字段都是明文

### 不同步的字段

- ❌ 内置 presets（硬编码在代码中，不需要同步）
- ❌ 临时缓存数据

### 同步策略

**使用扩展运算符**：
```typescript
// 自动同步配置文件中的所有字段
const config = {
  ...sourceConfig,  // 包含所有字段（已有 + 未来新增）
  providers: modifiedProviders,  // 只替换需要特殊处理的字段
}
```

**优点**：
- ✅ 未来新增字段自动同步（无需修改代码）
- ✅ 易于维护（不需要手动枚举字段）
- ✅ 避免字段遗漏

---

## 🔍 常见问题

### Q: WebDAV 同步和导出导入有什么区别？

**A**: 参见上文"功能概述 → 与导出导入的区别"表格。

### Q: 同步密码忘记了怎么办？

**A**:
- ❌ 无法恢复：AES-256 加密无后门
- ✅ 解决方案：
  1. 在任意一台**已配置的设备**上重新上传（使用新密码）
  2. 或者删除云端配置，重新上传

### Q: WebDAV 账号泄露了怎么办？

**A**:
- ✅ API Key 安全：云端存储的是密文，无法解密
- ⚠️ 但攻击者可以：
  - 查看配置结构（providers 数量、name、baseUrl）
  - 删除云端配置
  - 上传恶意配置（但无法解密你的密码）
- **建议**：立即修改 WebDAV 密码 + 重新上传配置

### Q: CLI 和 Desktop 的同步功能是否完全一样？

**A**:
- ✅ **功能完全一致**：都直接调用 `@ccman/core/sync` 模块
- ✅ **同步逻辑一致**：Upload/Download/Merge 行为相同
- ✅ **安全性一致**：加密算法、密码存储方式相同
- ⚠️ **体验差异**：CLI 命令行交互，Desktop 图形界面

### Q: Presets 会同步吗？

**A**:
- ✅ **用户自定义 presets** 会同步（存储在 `codex.json` / `claude.json`）
- ❌ **内置 presets** 不会同步（硬编码在代码中）
- **Merge 策略**：智能合并，去重 + 冲突处理

### Q: 如果两台设备同时修改配置会怎样？

**A**:
- **Upload 模式**：后上传的覆盖先上传的
- **Download 模式**：云端覆盖本地
- **Merge 模式**：按 `lastModified` 时间戳智能合并，保留最新的

### Q: 为什么不用 Git 同步？

**A**:
- ❌ API Key 明文提交 = 泄露风险
- ❌ 需要用户熟悉 Git 操作
- ❌ 冲突处理复杂（merge conflicts）
- ✅ WebDAV 更简单（文件上传/下载）
- ✅ 加密存储 API Key

---

## 📈 技术优势

### 1. 架构统一

- CLI 和 Desktop 共享同一套 `@ccman/core/sync` 模块
- 零代码重复，易于维护
- 功能完全一致

### 2. 安全性强

- API Key 使用军事级 AES-256-GCM 加密
- 100,000 轮 PBKDF2 密钥派生（防暴力破解）
- 文件权限 0600 保护本地密码

### 3. 易于维护

- 使用扩展运算符自动同步所有字段
- 未来新增字段无需修改代码
- 智能合并避免数据丢失

### 4. 用户体验好

- 自动备份和错误回滚
- 智能冲突解决（不丢失数据）
- 支持多种 WebDAV 服务

---

**文档版本**: v1.0.0
**适用版本**: ccman v3.0.20+
**维护者**: ccman 开发团队
