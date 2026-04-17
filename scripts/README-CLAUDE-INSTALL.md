# Claude Code 一键安装配置脚本

本目录新增了 Claude Code 一键安装配置脚本，目标是：

1. 检测当前平台、PowerShell/bash 与当前 Claude Code 版本
2. 通过 Claude Code 官方 native installer 安装或升级 Claude Code
3. 不把 Node.js / npm 当作 Claude Code 安装前置条件
4. 最后由脚本自身直接写入 `~/.claude/settings.json`

## 脚本入口

- Unix/macOS/Linux: `scripts/install-claude.sh`
- Windows PowerShell: `scripts/install-claude.ps1`

## 推荐使用

### 先看计划（不做真实改动）

```bash
bash scripts/install-claude.sh --dry-run
```

### 直接执行

```bash
bash scripts/install-claude.sh
```

下载后直接执行也可以：

```bash
chmod +x install-claude.sh
./install-claude.sh --dry-run
./install-claude.sh
```

### 指定 provider

```bash
bash scripts/install-claude.sh --provider anthropic
bash scripts/install-claude.sh --provider gmn
bash scripts/install-claude.sh --provider gmn1
```

### 指定安装目标

```bash
bash scripts/install-claude.sh --target latest
bash scripts/install-claude.sh --target stable
bash scripts/install-claude.sh --target 1.0.110
```

### 跳过配置，只装 Claude Code

```bash
bash scripts/install-claude.sh --skip-config
```

## 设计原则

- **官方安装器优先**：直接调用 Claude Code 官方 native installer
- **不依赖 Node/npm**：安装 Claude Code 本体时不要求用户预装 Node.js / npm
- **脚本自身写配置**：不要求预装 `ccman`，下载脚本后即可直接执行
- **备份后覆盖**：写入前备份原有 `~/.claude/settings.json`

## 当前约束

- Unix/macOS/Linux 侧需要 `bash` 以及 `curl` 或 `wget`
- Windows 侧需要 PowerShell 5+ 和内置 Web cmdlet
- Claude Code 安装完成后，当前终端可能需要重开一次才能刷新 PATH

## 基础验证

```bash
bash -n scripts/install-claude.sh
```
