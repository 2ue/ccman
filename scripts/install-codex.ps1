param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$CliArgs
)

$ErrorActionPreference = 'Stop'

$ProfileKey = 'gmn'
$ProfileTitle = 'GMN'
$ProviderName = ''
$BaseUrl = ''
$ApiKey = ''
$DryRun = $false
$AssumeYes = $false
$SkipConfig = $false

$CodexPackage = '@openai/codex'
$DefaultNodeRange = '>=16'
$RequiredNodeRange = $DefaultNodeRange
$RequiredNodeMajor = 16
$CodexProviderKey = 'gmn'
$CurrentStep = 0
$TotalSteps = 5

function Write-Banner {
  Write-Host 'Codex 一键安装配置向导' -ForegroundColor Cyan
  Write-Host '独立脚本 · 自动检测环境 · 默认推荐最稳安装路线' -ForegroundColor DarkGray
}

function Write-Step {
  param([string]$Title)
  $script:CurrentStep += 1
  Write-Host ''
  Write-Host "步骤 $($script:CurrentStep)/$script:TotalSteps · $Title" -ForegroundColor Blue
}

function Write-Info {
  param([string]$Message)
  Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-WarnLine {
  param([string]$Message)
  Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Success {
  param([string]$Message)
  Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Detail {
  param([string]$Message)
  Write-Host "   $Message" -ForegroundColor DarkGray
}

function Show-Command {
  param([string]$CommandLine)
  Write-Detail "执行命令: $CommandLine"
}

for ($index = 0; $index -lt $CliArgs.Count; $index += 1) {
  $arg = $CliArgs[$index]
  switch ($arg) {
    '--dry-run' { $DryRun = $true; continue }
    '--yes' { $AssumeYes = $true; continue }
    '--skip-config' { $SkipConfig = $true; continue }
    '--provider' {
      $ProfileKey = $CliArgs[$index + 1]
      $index += 1
      continue
    }
    '--provider-name' {
      $ProviderName = $CliArgs[$index + 1]
      $index += 1
      continue
    }
    '--base-url' {
      $BaseUrl = $CliArgs[$index + 1]
      $index += 1
      continue
    }
    '--api-key' {
      $ApiKey = $CliArgs[$index + 1]
      $index += 1
      continue
    }
    '--help' {
      Write-Host 'Usage: install-codex.ps1 [--dry-run] [--yes] [--skip-config] [--provider gmn|gmn1] [--provider-name name] [--base-url url] [--api-key key]'
      exit 0
    }
    default {
      if (-not $arg.StartsWith('-') -and [string]::IsNullOrWhiteSpace($ApiKey)) {
        $ApiKey = $arg
        continue
      }
      throw "未知参数: $arg"
    }
  }
}

switch ($ProfileKey) {
  'gmn' {
    $ProfileTitle = 'GMN'
    if ([string]::IsNullOrWhiteSpace($ProviderName)) { $ProviderName = 'gmn' }
    if ([string]::IsNullOrWhiteSpace($BaseUrl)) { $BaseUrl = 'https://gmn.chuangzuoli.com' }
  }
  'gmn1' {
    $ProfileTitle = 'GMN1'
    if ([string]::IsNullOrWhiteSpace($ProviderName)) { $ProviderName = 'gmn1' }
    if ([string]::IsNullOrWhiteSpace($BaseUrl)) { $BaseUrl = 'https://gmncode.cn' }
  }
  default {
    throw "不支持的 provider: $ProfileKey"
  }
}

function Get-CommandLineOutput {
  param(
    [string]$Command,
    [string[]]$Arguments
  )

  try {
    $output = & $Command @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) {
      return $null
    }
    return (($output | Select-Object -First 1) -as [string]).Trim()
  }
  catch {
    return $null
  }
}

function Get-FirstNumber {
  param([string]$Value)
  $match = [regex]::Match($Value, '(\d+)')
  if ($match.Success) {
    return [int]$match.Groups[1].Value
  }
  return $null
}

function Get-CodexVersion {
  if (Get-Command codex -ErrorAction SilentlyContinue) {
    $output = Get-CommandLineOutput -Command 'codex' -Arguments @('--version')
    if (-not [string]::IsNullOrWhiteSpace($output)) {
      $match = [regex]::Match($output, 'v?\d+(\.\d+){1,2}')
      if ($match.Success) {
        return $match.Value.TrimStart('v')
      }
    }
  }
  return $null
}

function Resolve-NodeRequirement {
  if (Get-Command npm -ErrorAction SilentlyContinue) {
    $output = Get-CommandLineOutput -Command 'npm' -Arguments @('view', $CodexPackage, 'engines.node', '--json')
    if (-not [string]::IsNullOrWhiteSpace($output)) {
      $RequiredNodeRange = $output.Trim('"')
    }
  }

  $major = Get-FirstNumber $RequiredNodeRange
  if ($null -ne $major) {
    $RequiredNodeMajor = $major
  }
}

function Get-Snapshot {
  $nodeVersion = $null
  if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = Get-CommandLineOutput -Command 'node' -Arguments @('-p', 'process.version.replace(/^v/, "")')
  }

  $npmVersion = $null
  if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVersion = Get-CommandLineOutput -Command 'npm' -Arguments @('--version')
  }

  $codexVersion = Get-CodexVersion

  $manager = $null
  foreach ($candidate in @('volta', 'fnm')) {
    if (Get-Command $candidate -ErrorAction SilentlyContinue) {
      $manager = $candidate
      break
    }
  }

  $nodeCompatible = $false
  if ($nodeVersion) {
    $major = [int]($nodeVersion.Split('.')[0])
    $nodeCompatible = $major -ge $RequiredNodeMajor
  }

  return [pscustomobject]@{
    NodeVersion = $nodeVersion
    NpmVersion = $npmVersion
    CodexVersion = $codexVersion
    Manager = $manager
    NodeCompatible = $nodeCompatible
  }
}

function Print-Summary {
  param([pscustomobject]$Snapshot)

  Write-Host '环境检测结果' -ForegroundColor White
  Write-Host "- 平台: Windows/$env:PROCESSOR_ARCHITECTURE"
  Write-Host "- Shell: PowerShell"
  Write-Host "- Node 要求: $RequiredNodeRange"
  Write-Host "- 当前 Node: $($Snapshot.NodeVersion ?? '未检测到') $(if ($Snapshot.NodeCompatible) { '(兼容)' } else { '(待处理)' })"
  Write-Host "- 当前 npm: $($Snapshot.NpmVersion ?? '未检测到')"
  Write-Host "- 当前 Codex: $($Snapshot.CodexVersion ?? '未检测到')"
  Write-Host "- 现有版本管理器: $($Snapshot.Manager ?? '无')"
  Write-Host "- 目标 Provider: $ProfileTitle"
  Write-Host "- 目标 Base URL: $BaseUrl"
}

function Print-Plan {
  param([pscustomobject]$Snapshot)

  Write-Host 'Codex 安装计划' -ForegroundColor White
  if ($Snapshot.NodeCompatible) {
    Write-Host "- 复用现有 Node.js $($Snapshot.NodeVersion)"
  }
  elseif ($Snapshot.Manager) {
    Write-Host "- 使用现有 $($Snapshot.Manager) 安装/切换到兼容的 Node.js"
  }
  else {
    Write-Host "- 未检测到兼容 Node.js，按推荐路线引导 Volta"
  }

  if ($Snapshot.CodexVersion) {
    Write-Host "- 升级并校验 Codex CLI（当前 $($Snapshot.CodexVersion)）"
  }
  else {
    Write-Host "- 安装并校验 Codex CLI"
  }

  if ($SkipConfig) {
    Write-Host "- 跳过 Codex 配置写入"
  }
  else {
    Write-Host "- 备份并写入 ~/.codex/config.toml 与 ~/.codex/auth.json"
  }

  Write-Host "- Windows 上仍建议优先在 WSL 中实际使用 Codex"
}

function Confirm-Continue {
  if ($AssumeYes) {
    return $true
  }

  $answer = Read-Host '确认按照以上计划继续？(y/N)'
  return $answer.ToLowerInvariant() -eq 'y'
}

function Ensure-VoltaPath {
  $voltaBin = Join-Path $env:LOCALAPPDATA 'Volta\bin'
  if (Test-Path $voltaBin) {
    $env:PATH = "$voltaBin;$env:PATH"
  }
}

function Ensure-CompatibleNode {
  param([pscustomobject]$Snapshot)

  Write-Step '准备 Node.js 运行环境'
  if ($Snapshot.NodeCompatible) {
    Write-Success "当前 Node.js $($Snapshot.NodeVersion) 已满足要求 $RequiredNodeRange"
    return
  }

  if ($Snapshot.Manager -eq 'volta') {
    Write-Info '检测到现有 Volta，准备安装/切换 Node.js'
    Show-Command 'volta install node'
    & volta install node
    Ensure-VoltaPath
    return
  }

  if ($Snapshot.Manager -eq 'fnm') {
    Write-Info '检测到现有 fnm，准备安装/切换 Node.js'
    Show-Command 'fnm install --lts'
    & fnm install --lts
    return
  }

  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Info '未检测到兼容 Node.js，按推荐路线通过 winget 引导 Volta'
    Show-Command 'winget install --id Volta.Volta -e --accept-package-agreements --accept-source-agreements'
    & winget install --id Volta.Volta -e --accept-package-agreements --accept-source-agreements
    Ensure-VoltaPath
    Show-Command 'volta install node'
    & volta install node
    return
  }

  if (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Info '未检测到兼容 Node.js，按推荐路线通过 Chocolatey 引导 Volta'
    Show-Command 'choco install volta -y'
    & choco install volta -y
    Ensure-VoltaPath
    Show-Command 'volta install node'
    & volta install node
    return
  }

  if (Get-Command scoop -ErrorAction SilentlyContinue) {
    Write-Info '未检测到兼容 Node.js，按推荐路线通过 Scoop 引导 Volta'
    Show-Command 'scoop install volta'
    & scoop install volta
    Ensure-VoltaPath
    Show-Command 'volta install node'
    & volta install node
    return
  }

  throw '未检测到 Node.js，也无法自动引导 Volta（缺少 winget/choco/scoop）。'
}

function Install-CodexCli {
  Write-Step '安装或升级 Codex CLI'
  Write-Info "准备安装 $CodexPackage@latest"
  Show-Command "npm install -g $CodexPackage@latest"
  & npm install -g "$CodexPackage@latest"
  if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
    throw 'Codex 安装完成后仍未出现在 PATH 中'
  }
  $versionOutput = Get-CommandLineOutput -Command 'codex' -Arguments @('--version')
  Write-Success 'Codex CLI 已可用'
  Write-Detail "版本输出: $versionOutput"
}

function Backup-FileIfExists {
  param([string]$FilePath)
  if (-not (Test-Path $FilePath)) {
    return $null
  }

  $backupPath = "$FilePath.bak.$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
  Copy-Item $FilePath $backupPath -Force
  return $backupPath
}

function Ensure-ApiKey {
  if ($SkipConfig) {
    return
  }

  if (-not [string]::IsNullOrWhiteSpace($ApiKey)) {
    return
  }

  $script:ApiKey = Read-Host '请输入 Codex Provider API Key'
  if ([string]::IsNullOrWhiteSpace($script:ApiKey)) {
    throw 'API Key 不能为空'
  }
}

function Write-CodexConfig {
  if ($SkipConfig) {
    Write-Info '根据参数选择，已跳过 ~/.codex 配置写入'
    return
  }

  Write-Step '写入 Codex 配置'
  $codexDir = Join-Path $HOME '.codex'
  $configPath = Join-Path $codexDir 'config.toml'
  $authPath = Join-Path $codexDir 'auth.json'
  $configBackup = Backup-FileIfExists $configPath
  $authBackup = Backup-FileIfExists $authPath

  New-Item -ItemType Directory -Force -Path $codexDir | Out-Null

  $configContent = @"
model = "gpt-5.4"
model_reasoning_effort = "xhigh"
disable_response_storage = true
sandbox_mode = "danger-full-access"
windows_wsl_setup_acknowledged = true
approval_policy = "never"
profile = "auto-max"
file_opener = "vscode"
model_provider = "$CodexProviderKey"
web_search = "cached"
suppress_unstable_features_warning = true

[history]
persistence = "save-all"

[tui]
notifications = true

[shell_environment_policy]
inherit = "all"
ignore_default_excludes = false

[sandbox_workspace_write]
network_access = true

[features]
plan_tool = true
apply_patch_freeform = true
view_image_tool = true
unified_exec = false
streamable_shell = false
rmcp_client = true
elevated_windows_sandbox = true

[profiles.auto-max]
approval_policy = "never"
sandbox_mode = "workspace-write"

[profiles.review]
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[notice]
hide_gpt5_1_migration_prompt = true

[model_providers.$CodexProviderKey]
name = "$CodexProviderKey"
base_url = "$BaseUrl"
wire_api = "responses"
requires_openai_auth = true
"@

  Set-Content -Path $configPath -Value $configContent -Encoding utf8NoBOM
  Set-Content -Path $authPath -Value (@{ OPENAI_API_KEY = $ApiKey } | ConvertTo-Json -Depth 5) -Encoding utf8NoBOM

  Write-Success "已写入 Codex 配置: $configPath"
  Write-Success "已写入 Codex 认证: $authPath"
  if ($configBackup) { Write-Detail "备份 config.toml: $configBackup" }
  if ($authBackup) { Write-Detail "备份 auth.json: $authBackup" }
}

if ($SkipConfig) {
  $script:TotalSteps = 4
}

Write-Banner
Write-Step '检测本机环境'
Resolve-NodeRequirement
$snapshot = Get-Snapshot
Print-Summary $snapshot
Write-Step '生成安装计划'
Print-Plan $snapshot

if ($DryRun) {
  Write-Host ''
  Write-Host '[DRY RUN] 未执行任何真实安装或配置动作。' -ForegroundColor Yellow
  exit 0
}

if (-not (Confirm-Continue)) {
  Write-WarnLine '已取消。'
  exit 0
}

Ensure-CompatibleNode $snapshot
$snapshot = Get-Snapshot
if (-not $snapshot.NodeCompatible) {
  throw "Node.js 仍不满足 Codex 运行要求 $RequiredNodeRange"
}

Install-CodexCli
Ensure-ApiKey
Write-CodexConfig

Write-Host ''
Write-Host '🎉 Codex 安装/升级与配置流程完成。' -ForegroundColor Green
Write-Detail '提示：如需首次认证，请运行 codex 并按官方提示登录或配置 API Key。'
