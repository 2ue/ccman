param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$CliArgs
)

$ErrorActionPreference = 'Stop'

$ProfileKey = 'anthropic'
$ProfileTitle = 'Anthropic Official'
$BaseUrl = ''
$ApiKey = ''
$DryRun = $false
$AssumeYes = $false
$SkipConfig = $false
$InstallTarget = 'latest'
$InstallerUrl = 'https://claude.ai/install.ps1'
$ClaudeVersion = $null
$CurrentStep = 0
$TotalSteps = 4

function Write-Banner {
  Write-Host 'Claude Code 一键安装配置向导' -ForegroundColor Cyan
  Write-Host '官方 native installer · 不依赖 Node/npm · 自动写入 Claude 配置' -ForegroundColor DarkGray
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

function Show-Usage {
  Write-Host 'Usage: install-claude.ps1 [--dry-run] [--yes] [--skip-config] [--provider anthropic|gmn|gmn1] [--base-url url] [--target latest|stable|VERSION] [--api-key key]'
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
    '--base-url' {
      $BaseUrl = $CliArgs[$index + 1]
      $index += 1
      continue
    }
    '--target' {
      $InstallTarget = $CliArgs[$index + 1]
      $index += 1
      continue
    }
    '--api-key' {
      $ApiKey = $CliArgs[$index + 1]
      $index += 1
      continue
    }
    '--help' {
      Show-Usage
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
  'anthropic' {
    $ProfileTitle = 'Anthropic Official'
    if ([string]::IsNullOrWhiteSpace($BaseUrl)) { $BaseUrl = 'https://api.anthropic.com' }
  }
  'gmn' {
    $ProfileTitle = 'GMN'
    if ([string]::IsNullOrWhiteSpace($BaseUrl)) { $BaseUrl = 'https://gmn.chuangzuoli.com' }
  }
  'gmn1' {
    $ProfileTitle = 'GMN1'
    if ([string]::IsNullOrWhiteSpace($BaseUrl)) { $BaseUrl = 'https://gmncode.cn' }
  }
  default {
    throw "不支持的 provider: $ProfileKey"
  }
}

if ($InstallTarget -notmatch '^(stable|latest|\d+\.\d+\.\d+(-[^\s]+)?)$') {
  throw "不支持的安装目标: $InstallTarget"
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

function Get-ClaudeVersion {
  if (Get-Command claude -ErrorAction SilentlyContinue) {
    $output = Get-CommandLineOutput -Command 'claude' -Arguments @('--version')
    if (-not [string]::IsNullOrWhiteSpace($output)) {
      $match = [regex]::Match($output, 'v?\d+(\.\d+){1,2}')
      if ($match.Success) {
        return $match.Value.TrimStart('v')
      }
    }
  }
  return $null
}

function Get-DisplayValue {
  param(
    [AllowNull()]
    [string]$Value,
    [string]$Fallback
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $Fallback
  }

  return $Value
}

function Write-Utf8NoBomFile {
  param(
    [string]$Path,
    [string]$Content
  )

  $parent = Split-Path -Parent $Path
  if (-not [string]::IsNullOrWhiteSpace($parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Refresh-Snapshot {
  $script:ClaudeVersion = Get-ClaudeVersion
}

function Print-Summary {
  Write-Host '环境检测结果' -ForegroundColor White
  Write-Host "- 平台: Windows/$env:PROCESSOR_ARCHITECTURE"
  Write-Host "- Shell: PowerShell"
  Write-Host "- 当前 Claude Code: $(Get-DisplayValue -Value $script:ClaudeVersion -Fallback '未检测到')"
  Write-Host "- 安装目标: $InstallTarget"
  Write-Host "- 安装器: Claude Code 官方 native installer"
  Write-Host "- 目标 Provider: $ProfileTitle"
  Write-Host "- 目标 Base URL: $BaseUrl"
}

function Print-Plan {
  Write-Host 'Claude Code 安装计划' -ForegroundColor White
  if ($script:ClaudeVersion) {
    Write-Host "- 通过官方 native installer 升级 Claude Code（当前 $($script:ClaudeVersion)）"
  }
  else {
    Write-Host "- 通过官方 native installer 安装 Claude Code"
  }

  Write-Host "- 安装目标: $InstallTarget"

  if ($SkipConfig) {
    Write-Host "- 跳过 Claude Code 配置写入"
  }
  else {
    Write-Host "- 备份并写入 ~/.claude/settings.json"
  }

  Write-Host "- 安装过程不要求预装 Node.js 或 npm"
}

function Confirm-Continue {
  if ($AssumeYes) {
    return $true
  }

  $answer = Read-Host '确认按照以上计划继续？(y/N)'
  return $answer.ToLowerInvariant() -eq 'y'
}

function Install-ClaudeCode {
  Write-Step '安装或升级 Claude Code'

  $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("ccman-claude-install-" + [guid]::NewGuid().ToString('N'))
  $installerPath = Join-Path $tempDir 'install.ps1'

  New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

  try {
    Write-Info '准备下载 Claude Code 官方安装器'
    Show-Command "Invoke-WebRequest -Uri $InstallerUrl -OutFile $installerPath"
    Invoke-WebRequest -Uri $InstallerUrl -OutFile $installerPath

    Show-Command "& $installerPath $InstallTarget"
    & $installerPath $InstallTarget
  }
  finally {
    if (Test-Path $tempDir) {
      Remove-Item -Force -Recurse $tempDir
    }
  }

  Refresh-Snapshot
  if ($script:ClaudeVersion) {
    Write-Success 'Claude Code 已可用'
    Write-Detail "版本输出: $($script:ClaudeVersion)"
    return
  }

  Write-WarnLine 'Claude Code 安装器已执行完成，但当前终端未检测到 claude 命令。'
  Write-Detail '如安装已成功，请重新打开终端后执行: claude --version'
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

  $script:ApiKey = Read-Host '请输入 Claude Code Provider API Key'
  if ([string]::IsNullOrWhiteSpace($script:ApiKey)) {
    throw 'API Key 不能为空'
  }
}

function Write-ClaudeConfig {
  if ($SkipConfig) {
    Write-Info '根据参数选择，已跳过 ~/.claude/settings.json 写入'
    return
  }

  Write-Step '写入 Claude Code 配置'
  $claudeDir = Join-Path $HOME '.claude'
  $configPath = Join-Path $claudeDir 'settings.json'
  $configBackup = Backup-FileIfExists $configPath

  New-Item -ItemType Directory -Force -Path $claudeDir | Out-Null

  $config = [ordered]@{
    env = [ordered]@{
      ANTHROPIC_AUTH_TOKEN = $ApiKey
      ANTHROPIC_BASE_URL = $BaseUrl
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = 1
      CLAUDE_CODE_MAX_OUTPUT_TOKENS = 32000
    }
    permissions = [ordered]@{
      allow = @()
      deny = @()
    }
    alwaysThinkingEnabled = $true
  }

  Write-Utf8NoBomFile -Path $configPath -Content ($config | ConvertTo-Json -Depth 8)

  Write-Success "已写入 Claude Code 配置: $configPath"
  if ($configBackup) { Write-Detail "备份 settings.json: $configBackup" }
}

if ($SkipConfig) {
  $script:TotalSteps = 3
}

Write-Banner
Write-Step '检测本机环境'
Refresh-Snapshot
Print-Summary
Write-Step '生成安装计划'
Print-Plan

if ($DryRun) {
  Write-Host ''
  Write-Host '[DRY RUN] 未执行任何真实安装或配置动作。' -ForegroundColor Yellow
  exit 0
}

if (-not (Confirm-Continue)) {
  Write-WarnLine '已取消。'
  exit 0
}

Install-ClaudeCode
Ensure-ApiKey
Write-ClaudeConfig

Write-Host ''
Write-Host '🎉 Claude Code 安装/升级与配置流程完成。' -ForegroundColor Green
Write-Detail '提示：如当前终端仍找不到 claude 命令，请新开终端后执行 claude --version。'
