## [3.1.0](https://github.com/2ue/ccman/compare/v3.0.33...v3.1.0) (2025-11-20)

### Features

* **gemini-cli:** 完善 Gemini CLI 服务商支持 ([4f64b27](https://github.com/2ue/ccman/commit/4f64b273464d1d41dd73de8bfe3af3f3135208fc))

### Bug Fixes

* **desktop:** 修复 PresetFormModal 缺少 gemini 类型支持 ([a5e69a7](https://github.com/2ue/ccman/commit/a5e69a7b835b347b4fb68e7f5b71cce60be3219b))
## [3.0.33](https://github.com/2ue/ccman/compare/v3.0.32...v3.0.33) (2025-11-18)

### Features

* **desktop:** 优化 UI 布局和清理工具体验 ([d3f067a](https://github.com/2ue/ccman/commit/d3f067af366435ad0f7d89b0f81bd83959047cd5))
## [3.0.32](https://github.com/2ue/ccman/compare/v3.0.31...v3.0.32) (2025-11-18)

### Bug Fixes

* **cli:** 修复 @ccman/core 未打包导致运行时找不到模块的问题 ([ce304b4](https://github.com/2ue/ccman/commit/ce304b4b735375db2360b6684f85981bc0bde423))
## [3.0.31](https://github.com/2ue/ccman/compare/v3.0.30...v3.0.31) (2025-11-18)
## [3.0.30](https://github.com/2ue/ccman/compare/v3.0.29...v3.0.30) (2025-11-18)

### Bug Fixes

* **desktop:** 修复 CI 构建时 --publish=never 参数传递问题 ([202e83b](https://github.com/2ue/ccman/commit/202e83b0a4dac1f956af179697da47143d708b8f))
* **desktop:** 修复检查更新报错并支持自动更新 ([147e5ba](https://github.com/2ue/ccman/commit/147e5baf27e2b659b3c730a23ca37e9d229e0348))
## [3.0.29](https://github.com/2ue/ccman/compare/v3.0.28...v3.0.29) (2025-11-17)

### Bug Fixes

* **desktop:** remove publish config to prevent build conflict ([e997a10](https://github.com/2ue/ccman/commit/e997a10e6a3bf213e578c02a6ec005f86753fd9f))
## [3.0.28](https://github.com/2ue/ccman/compare/v3.0.27...v3.0.28) (2025-11-14)

### Features

* **desktop:** implement Dashboard + MiniSidebar navigation ([67f151a](https://github.com/2ue/ccman/commit/67f151ac268c7c6703b5bc3054154055eaf0d345))

### Bug Fixes

* **desktop:** fix React key warning and refactor ProjectHistoryTable ([76b18a7](https://github.com/2ue/ccman/commit/76b18a7457e0468bf8fc321ed8028d25b229429d))
## [3.0.27](https://github.com/2ue/ccman/compare/v3.0.26...v3.0.27) (2025-11-12)
## [3.0.26](https://github.com/2ue/ccman/compare/v3.0.25...v3.0.26) (2025-11-12)

### Features

* **cli:** add MCP management commands ([ce73d56](https://github.com/2ue/ccman/commit/ce73d56ca9df13283d6efca5b73ebcd00c03b82a))
* **core:** add MCP server management functionality ([e7957ca](https://github.com/2ue/ccman/commit/e7957cac19a67c478e731fa24028ef2f0690ad0d))
* **core:** improve path safety with unified rootDir approach ([99d8920](https://github.com/2ue/ccman/commit/99d89204e174a33264edcf121c4ac11e7274940a))
* **desktop:** add MCP management UI with complete CRUD operations ([0aeaf91](https://github.com/2ue/ccman/commit/0aeaf914dca28ef4fd90aa8ee52bf1e8fb939d27))

### Bug Fixes

* **desktop:** improve clean page error handling and UI feedback ([56c387d](https://github.com/2ue/ccman/commit/56c387d74df951cab3a618d7793294939bed2b44))
## [3.0.25](https://github.com/2ue/ccman/compare/v3.0.24...v3.0.25) (2025-11-10)

### Features

* **core:** add ~/.claude.json cleaning functionality ([e17ab81](https://github.com/2ue/ccman/commit/e17ab81743a86ce00df4a9aa8f345bf0a9ae3424))
* **desktop:** add clean page UI for ~/.claude.json management ([71f284f](https://github.com/2ue/ccman/commit/71f284f950d05464481c69efcf664d8abb97bf21))
## [3.0.24](https://github.com/2ue/ccman/compare/v3.0.23...v3.0.24) (2025-10-29)

### Bug Fixes

* **core:** fix provider switching logic in writeClaudeConfig ([effd21f](https://github.com/2ue/ccman/commit/effd21f0df2c90c89276f00e32a2a98a66345963))
* **desktop:** refresh UI after WebDAV sync operations ([c03e965](https://github.com/2ue/ccman/commit/c03e9659d94cb0be12dca0a09b94c57443737b47))
## [3.0.23](https://github.com/2ue/ccman/compare/v3.0.21...v3.0.23) (2025-10-25)
## [3.0.21](https://github.com/2ue/ccman/compare/v3.0.20...v3.0.21) (2025-10-23)
## [3.0.20](https://github.com/2ue/ccman/compare/v3.0.19...v3.0.20) (2025-10-21)
## [3.0.19](https://github.com/2ue/ccman/compare/v3.0.18...v3.0.19) (2025-10-19)

### Features

* **ui:** 实现版本号动态加载和优化设置页面布局 ([49e8f4c](https://github.com/2ue/ccman/commit/49e8f4c003ce1d19caedb36c0320126afcb47376))

### Bug Fixes

* **core:** 修复服务商名称大小写敏感匹配问题 ([5e18a55](https://github.com/2ue/ccman/commit/5e18a550a1b44e8b46a99638079eb75ac8962e55))
* **desktop:** 修复 electron-builder 配置以符合 24.13.3 版本要求 ([9f038d3](https://github.com/2ue/ccman/commit/9f038d375b22f07c663a2397156559378a66d571))
* **desktop:** 移除图标文件引用以修复 CI 构建 ([ee7fe5a](https://github.com/2ue/ccman/commit/ee7fe5ac0b6e5cca9d0ac5d2c942e10ff9da722d))
## [3.0.18](https://github.com/2ue/ccman/compare/v3.0.17...v3.0.18) (2025-10-13)

### Features

* **core:** 添加备份自动清理机制 ([ec213c8](https://github.com/2ue/ccman/commit/ec213c80e6be6725ea1929261eff307d90416308))
## [3.0.17](https://github.com/2ue/ccman/compare/v3.0.16...v3.0.17) (2025-10-13)
## [3.0.16](https://github.com/2ue/ccman/compare/v3.0.15...v3.0.16) (2025-10-12)
## [3.0.15](https://github.com/2ue/ccman/compare/v3.0.14...v3.0.15) (2025-10-12)

### Features

* 实现配置导入导出功能 ([b5d2999](https://github.com/2ue/ccman/commit/b5d299959c7e48d41c6a073945a381ede1d9df1a))
## [3.0.14](https://github.com/2ue/ccman/compare/v3.0.13...v3.0.14) (2025-10-12)

### Features

* **cli:** 实现 WebDAV 同步命令 ([ead5daa](https://github.com/2ue/ccman/commit/ead5daad36d5fe761edaa54ab589b941bbff0d9e))
* **sync:** 实现智能同步功能（三种模式） ([6723b5c](https://github.com/2ue/ccman/commit/6723b5cf39c1839c8a5901f93c2a3a1928b53267))
* **sync:** 统一配置文件管理和改进 CLI 配置体验 ([63202d0](https://github.com/2ue/ccman/commit/63202d0dbf4d975d18b7e55fd8cab0f0760f1ce5))

### Bug Fixes

* **cli:** 修复交互式同步菜单命令解析错误 ([abdcec6](https://github.com/2ue/ccman/commit/abdcec664a939bfe6a81e9ed5213396a97585f64))
## [3.0.13](https://github.com/2ue/ccman/compare/v3.0.12...v3.0.13) (2025-10-12)

### Features

* **sync:** 添加 WebDAV 同步基础功能 ([1dbd6ff](https://github.com/2ue/ccman/commit/1dbd6ffbe878adc5b860689464a720ac540cf8af))
## [3.0.12](https://github.com/2ue/ccman/compare/v3.0.11...v3.0.12) (2025-10-12)

### Features

* **cli:** 优化列表输出为 Vercel 风格 ([9c2aa5e](https://github.com/2ue/ccman/commit/9c2aa5e5d614f63fea0bc8435ecc31ff356f8e34))
## [3.0.11](https://github.com/2ue/ccman/compare/v3.0.6...v3.0.11) (2025-10-11)

### Features

* **core:** 添加 KKYYXX API 服务预设 ([e07b140](https://github.com/2ue/ccman/commit/e07b140308fb5e4f6c1f4b3a2805ef2cab3c4dfc))
## [3.0.6](https://github.com/2ue/ccman/compare/v3.0.10...v3.0.6) (2025-10-11)

### Bug Fixes

* **core:** 修复 import.meta.url 在 CommonJS 环境下为 undefined 的问题 ([34ebbca](https://github.com/2ue/ccman/commit/34ebbcaa31ddf9a4be36e0826c08fa39905812af))
## [3.0.9](https://github.com/2ue/ccman/compare/v3.0.8...v3.0.9) (2025-10-11)

### Features

* **core,cli:** v2 到 v3 配置迁移 + CLI 用户体验改进 ([69e9351](https://github.com/2ue/ccman/commit/69e935154299dd86b0974c678600f0cbcc80fc8b))

### Bug Fixes

* **cli:** 修复配置文件路径显示错误，使用真实路径代替硬编码 ([c0439d3](https://github.com/2ue/ccman/commit/c0439d350dd531da6ec678a61301008b9f1c6750))
## [3.0.8](https://github.com/2ue/ccman/compare/v3.0.7...v3.0.8) (2025-10-11)
## [3.0.7](https://github.com/2ue/ccman/compare/v3.0.5...v3.0.7) (2025-10-11)

### Bug Fixes

* **cli:** 修复 Node 18 兼容性问题 ([f455ceb](https://github.com/2ue/ccman/commit/f455ceb9b64a481a65d1545352cd85d1e51907f0))
* **cli:** 修复 npm 包缺少文件的问题 ([34bf752](https://github.com/2ue/ccman/commit/34bf752257feefe33f626d7d5bb91632220879e7))
* **cli:** 移除 dependencies 中的 @ccman/core ([5d4bc15](https://github.com/2ue/ccman/commit/5d4bc15efb3ea63bbc4126d0321461c9e9da45a3))
## [3.0.5](https://github.com/2ue/ccman/compare/v3.0.4...v3.0.5) (2025-10-11)
## [3.0.4](https://github.com/2ue/ccman/compare/v3.0.3...v3.0.4) (2025-10-09)

### Bug Fixes

* **desktop:** 修复 Electron ESM/CJS 配置问题 ([f0ffdf7](https://github.com/2ue/ccman/commit/f0ffdf71b0b71e76701add22388eaa3471c13b9f))
## [3.0.3](https://github.com/2ue/ccman/compare/v3.0.2...v3.0.3) (2025-10-08)

### Bug Fixes

* **desktop:** 修复打包后窗口不显示的问题 ([0047af4](https://github.com/2ue/ccman/commit/0047af4cd6c9749d25d8e7bd2821bc721461274f))
## [3.0.2](https://github.com/2ue/ccman/compare/v3.0.1...v3.0.2) (2025-10-07)

### Features

* 使用 tsup 打包 CLI，内联 @ccman/core 依赖 ([71f0c83](https://github.com/2ue/ccman/commit/71f0c834d1485bd7ba3d228d19d77a84c2e2322a))
## [3.0.1](https://github.com/2ue/ccman/compare/v3.0.0...v3.0.1) (2025-10-07)

### Bug Fixes

* 修复 Desktop ESM 错误并优化发布流程 ([7a3fb3a](https://github.com/2ue/ccman/commit/7a3fb3a3219bcde05cc7ce89f5411342598589b2))
* 修复 npm 发布时 workspace 依赖无法解析的问题 ([3fc264f](https://github.com/2ue/ccman/commit/3fc264f8dc6714fd1e3f72d59f40f76c3d3d38d8))
* 正确处理 workspace 依赖 ([9a2b834](https://github.com/2ue/ccman/commit/9a2b834327fe890f57675b53f82a884cf3d8449f))
## [3.0.0](https://github.com/2ue/ccman/compare/3a6e8eabf8919efe59371ab133deedd656827521...v3.0.0) (2025-10-07)

### Features

* 从 package.json 动态读取版本号 + 修复 GitHub Actions ([1296554](https://github.com/2ue/ccman/commit/1296554387b964a203546483968c3787f717e28c))
* 完整重构 ccman 项目 ([3a6e8ea](https://github.com/2ue/ccman/commit/3a6e8eabf8919efe59371ab133deedd656827521))

### Bug Fixes

* 修复 GitHub Actions 配置 ([291e71a](https://github.com/2ue/ccman/commit/291e71a3fd30869759f37034f72b8b6be9054c69))
* 修复 npm 发布和 Desktop 打包配置 ([107facb](https://github.com/2ue/ccman/commit/107facb5ccf1074e4a180646b57d158cc09d9490))
* 修复多个编译和运行问题 ([857b79d](https://github.com/2ue/ccman/commit/857b79d610bba7e245899cceef8b0e5c43c85bc6))
