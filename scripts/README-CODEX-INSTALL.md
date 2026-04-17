# Codex 一键安装配置脚本

本目录新增了 Codex 一键安装配置脚本，目标是：

1. 检测当前平台、Node.js、npm、Codex、版本管理器
2. 优先复用现有兼容环境
3. 需要修复时优先走推荐路线（Volta / 现有版本管理器）
4. 安装或升级 Codex CLI
5. 最后由脚本自身直接写入 `~/.codex/config.toml` 和 `~/.codex/auth.json`

## 脚本入口

- Unix/macOS/Linux: `scripts/install-codex.sh`
- Windows PowerShell: `scripts/install-codex.ps1`

## 推荐使用

### 先看计划（不做真实改动）

```bash
bash scripts/install-codex.sh --dry-run
```

### 直接执行

```bash
bash scripts/install-codex.sh
```

下载后直接执行也可以：

```bash
chmod +x install-codex.sh
./install-codex.sh --dry-run
./install-codex.sh
```

### 指定 provider

```bash
bash scripts/install-codex.sh --provider gmn
bash scripts/install-codex.sh --provider gmn1
```

### 跳过配置，只装 Codex

```bash
bash scripts/install-codex.sh --skip-config
```

## 设计原则

- **先复用再修复**：已有兼容 Node.js 就不动
- **优先现有管理器**：检测到 `volta` / `fnm` / `nvm` / `mise` / `asdf` 时优先复用
- **默认推荐 Volta**：没有管理器时按推荐路线引导 Volta
- **脚本自身写配置**：不要求预装 `ccman`，下载脚本后即可直接执行
- **测试只做模拟**：仓库内验证只允许 dry-run、语法检查和纯逻辑测试，不自动触碰真实环境

## 当前约束

- 自动化验证不会真实安装 Node.js / Codex
- 推荐分发方式是直接分发 `install-codex.sh` 或 `install-codex.ps1`
- Windows 侧仍建议优先在 WSL 中实际使用 Codex

## 基础验证

```bash
bash -n scripts/install-codex.sh
```
