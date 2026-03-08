#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import readline from 'node:readline'
import {
  CODEX_PACKAGE_NAME,
  DEFAULT_CODEX_NODE_RANGE,
  MIN_BOOTSTRAP_NODE_VERSION,
  pickExistingManager,
  planCodexBootstrap,
  renderPlan,
  resolveProviderProfile,
  satisfiesVersionRange,
} from './codex-bootstrap-lib.mjs'

const CODEX_PROVIDER_KEY = 'gmn'

function parseArgs(argv) {
  const result = {
    apiKey: '',
    provider: 'gmn',
    providerName: '',
    baseUrl: '',
    dryRun: false,
    yes: false,
    skipConfig: false,
    fromSnapshot: '',
    printJson: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') {
      result.dryRun = true
    } else if (arg === '--yes') {
      result.yes = true
    } else if (arg === '--skip-config') {
      result.skipConfig = true
    } else if (arg === '--print-json') {
      result.printJson = true
    } else if (arg === '--provider') {
      result.provider = argv[index + 1] || result.provider
      index += 1
    } else if (arg === '--provider-name') {
      result.providerName = argv[index + 1] || result.providerName
      index += 1
    } else if (arg === '--base-url') {
      result.baseUrl = argv[index + 1] || result.baseUrl
      index += 1
    } else if (arg === '--api-key') {
      result.apiKey = argv[index + 1] || result.apiKey
      index += 1
    } else if (arg === '--from-snapshot') {
      result.fromSnapshot = argv[index + 1] || result.fromSnapshot
      index += 1
    } else if (!arg.startsWith('-') && !result.apiKey) {
      result.apiKey = arg
    }
  }

  return result
}

function createPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return {
    question(message) {
      return new Promise((resolve) => {
        rl.question(message, resolve)
      })
    },
    close() {
      rl.close()
    },
  }
}

function backupFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null
  }

  const backupPath = `${filePath}.bak.${Date.now()}`
  fs.copyFileSync(filePath, backupPath)
  return backupPath
}

function writeStandaloneCodexConfig({ baseUrl, apiKey }) {
  const codexDir = path.join(os.homedir(), '.codex')
  const configPath = path.join(codexDir, 'config.toml')
  const authPath = path.join(codexDir, 'auth.json')

  fs.mkdirSync(codexDir, { recursive: true, mode: 0o700 })
  const configBackup = backupFileIfExists(configPath)
  const authBackup = backupFileIfExists(authPath)

  const configContent = [
    'model = "gpt-5.4"',
    'model_reasoning_effort = "xhigh"',
    'disable_response_storage = true',
    'sandbox_mode = "danger-full-access"',
    'windows_wsl_setup_acknowledged = true',
    'approval_policy = "never"',
    'profile = "auto-max"',
    'file_opener = "vscode"',
    `model_provider = "${CODEX_PROVIDER_KEY}"`,
    'web_search = "cached"',
    'suppress_unstable_features_warning = true',
    '',
    '[history]',
    'persistence = "save-all"',
    '',
    '[tui]',
    'notifications = true',
    '',
    '[shell_environment_policy]',
    'inherit = "all"',
    'ignore_default_excludes = false',
    '',
    '[sandbox_workspace_write]',
    'network_access = true',
    '',
    '[features]',
    'plan_tool = true',
    'apply_patch_freeform = true',
    'view_image_tool = true',
    'unified_exec = false',
    'streamable_shell = false',
    'rmcp_client = true',
    'elevated_windows_sandbox = true',
    '',
    '[profiles.auto-max]',
    'approval_policy = "never"',
    'sandbox_mode = "workspace-write"',
    '',
    '[profiles.review]',
    'approval_policy = "on-request"',
    'sandbox_mode = "workspace-write"',
    '',
    '[notice]',
    'hide_gpt5_1_migration_prompt = true',
    '',
    `[model_providers.${CODEX_PROVIDER_KEY}]`,
    `name = "${CODEX_PROVIDER_KEY}"`,
    `base_url = "${baseUrl}"`,
    'wire_api = "responses"',
    'requires_openai_auth = true',
    '',
  ].join('\n')

  fs.writeFileSync(configPath, configContent, { mode: 0o600 })
  fs.writeFileSync(authPath, JSON.stringify({ OPENAI_API_KEY: apiKey }, null, 2), { mode: 0o600 })

  return {
    configPath,
    authPath,
    configBackup,
    authBackup,
  }
}

function commandExists(command, platform = process.platform, env = process.env) {
  const probe =
    platform === 'win32'
      ? spawnSync('where', [command], { encoding: 'utf-8', env })
      : spawnSync('bash', ['-lc', `command -v ${command}`], { encoding: 'utf-8', env })

  return probe.status === 0
}

function readCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  })

  if (result.status !== 0) {
    return null
  }

  const output = `${result.stdout || ''}`.trim()
  return output || null
}

function detectNvmPath() {
  const homeDir = os.homedir()
  const candidates = [
    process.env.NVM_DIR ? path.join(process.env.NVM_DIR, 'nvm.sh') : '',
    path.join(homeDir, '.nvm', 'nvm.sh'),
    path.join(homeDir, '.config', 'nvm', 'nvm.sh'),
    '/opt/homebrew/opt/nvm/nvm.sh',
    '/usr/local/opt/nvm/nvm.sh',
  ].filter(Boolean)

  return candidates.find((candidate) => fs.existsSync(candidate)) || null
}

function detectSnapshotFromSystem() {
  const platform = process.platform
  const nodeVersion = process.version.replace(/^v/, '')
  const npmVersion = readCommand('npm', ['--version'])
  const codexVersionRaw = readCommand('codex', ['--version'])
  const codexVersionMatch = codexVersionRaw?.match(/v?\d+(?:\.\d+){1,2}/)
  const codexVersion = codexVersionMatch ? codexVersionMatch[0].replace(/^v/, '') : null
  const nvmPath = platform === 'win32' ? null : detectNvmPath()

  return {
    platform,
    arch: process.arch,
    shell: process.env.SHELL || process.env.ComSpec || '',
    node: {
      installed: true,
      version: nodeVersion,
    },
    npm: {
      installed: Boolean(npmVersion),
      version: npmVersion,
    },
    codex: {
      installed: Boolean(codexVersion),
      version: codexVersion,
    },
    tools: {
      bash: platform === 'win32' ? false : commandExists('bash', platform),
      curl: platform === 'win32' ? false : commandExists('curl', platform),
      pnpm: commandExists('pnpm', platform),
      volta: commandExists('volta', platform),
      fnm: commandExists('fnm', platform),
      nvm: Boolean(nvmPath),
      mise: commandExists('mise', platform),
      asdf: commandExists('asdf', platform),
      winget: platform === 'win32' ? commandExists('winget', platform) : false,
      choco: platform === 'win32' ? commandExists('choco', platform) : false,
      scoop: platform === 'win32' ? commandExists('scoop', platform) : false,
    },
    metadata: {
      nvmPath,
    },
  }
}

function loadSnapshotFromFile(snapshotPath) {
  return JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'))
}

function resolveCodexNodeRequirement(snapshot) {
  if (!snapshot.npm?.installed) {
    return DEFAULT_CODEX_NODE_RANGE
  }

  const output = readCommand('npm', ['view', CODEX_PACKAGE_NAME, 'engines.node', '--json'], {
    timeout: 15000,
  })

  if (!output) {
    return DEFAULT_CODEX_NODE_RANGE
  }

  try {
    const parsed = JSON.parse(output)
    if (typeof parsed === 'string' && parsed.trim()) {
      return parsed.trim()
    }
  } catch {
    if (output.trim()) {
      return output.trim().replace(/^"|"$/g, '')
    }
  }

  return DEFAULT_CODEX_NODE_RANGE
}

function renderEnvironment(snapshot, requiredNodeRange) {
  const manager = pickExistingManager(snapshot)
  const lines = [
    '环境检测结果',
    `- 平台: ${snapshot.platform}/${snapshot.arch}`,
    `- Shell: ${snapshot.shell || 'unknown'}`,
    `- Node: ${snapshot.node?.version || '未检测到'} ${satisfiesVersionRange(snapshot.node?.version || '', requiredNodeRange) ? '(兼容)' : '(待处理)'}`,
    `- npm: ${snapshot.npm?.version || '未检测到'}`,
    `- Codex: ${snapshot.codex?.version || '未检测到'}`,
    `- 优先版本管理器: ${manager || '无'}`,
  ]
  return lines.join('\n')
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`
}

function getVoltaBinDir(platform) {
  if (platform === 'win32') {
    return path.join(
      process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
      'Volta',
      'bin'
    )
  }
  return path.join(os.homedir(), '.volta', 'bin')
}

function createExecContext(snapshot, managerName) {
  const context = {
    platform: snapshot.platform,
    manager: managerName || null,
    env: { ...process.env },
  }

  if (managerName === 'volta') {
    const binDir = getVoltaBinDir(snapshot.platform)
    context.env.PATH = `${binDir}${path.delimiter}${context.env.PATH || ''}`
  }

  return context
}

function runShell(command, { platform, env, inherit = true } = {}) {
  if (platform === 'win32') {
    return spawnSync('powershell', ['-NoProfile', '-Command', command], {
      stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      env,
      encoding: 'utf-8',
    })
  }

  return spawnSync('bash', ['-lc', command], {
    stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    env,
    encoding: 'utf-8',
  })
}

function buildManagerInstallCommand(snapshot, managerName) {
  switch (managerName) {
    case 'volta':
      return 'volta install node'
    case 'fnm':
      return 'fnm install --lts'
    case 'nvm': {
      const nvmPath = snapshot.metadata?.nvmPath
      if (!nvmPath) {
        throw new Error('检测到 nvm 但未找到 nvm.sh')
      }
      return `source ${shellQuote(nvmPath)} && nvm install --lts`
    }
    case 'mise':
      return 'mise use -g node@lts'
    case 'asdf':
      return 'asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git || true && asdf install nodejs latest && asdf global nodejs latest && asdf reshim nodejs'
    default:
      throw new Error(`暂不支持自动使用管理器: ${managerName}`)
  }
}

function buildManagerExecCommand(snapshot, managerName, command, args) {
  const joinedArgs = args.map((item) => shellQuote(item)).join(' ')
  const payload = `${command}${joinedArgs ? ` ${joinedArgs}` : ''}`

  switch (managerName) {
    case 'volta':
      return payload
    case 'fnm':
      return `fnm exec --using=lts-latest -- ${payload}`
    case 'nvm': {
      const nvmPath = snapshot.metadata?.nvmPath
      if (!nvmPath) {
        throw new Error('检测到 nvm 但未找到 nvm.sh')
      }
      return `source ${shellQuote(nvmPath)} && nvm exec --lts ${payload}`
    }
    case 'mise':
      return `mise exec -- ${payload}`
    case 'asdf':
      return `asdf exec ${payload}`
    default:
      return payload
  }
}

function bootstrapVolta(snapshot, yes) {
  if (snapshot.platform === 'win32') {
    if (snapshot.tools.winget) {
      return `winget install --id Volta.Volta -e --accept-package-agreements --accept-source-agreements`
    }
    if (snapshot.tools.choco) {
      return 'choco install volta -y'
    }
    if (snapshot.tools.scoop) {
      return 'scoop install volta'
    }
    throw new Error('Windows 未检测到 winget/choco/scoop，无法自动引导 Volta')
  }

  if (!snapshot.tools.curl) {
    throw new Error('未检测到 curl，无法自动引导 Volta')
  }

  return 'curl https://get.volta.sh | bash'
}

function runManagedCommand(snapshot, execContext, command, args = []) {
  if (!execContext.manager || execContext.manager === 'volta') {
    const result = spawnSync(command, args, {
      stdio: 'inherit',
      env: execContext.env,
      encoding: 'utf-8',
    })
    if (result.status !== 0) {
      throw new Error(`命令执行失败: ${command} ${args.join(' ')}`)
    }
    return
  }

  const shellCommand = buildManagerExecCommand(snapshot, execContext.manager, command, args)
  const result = runShell(shellCommand, {
    platform: snapshot.platform,
    env: execContext.env,
    inherit: true,
  })
  if (result.status !== 0) {
    throw new Error(`命令执行失败: ${shellCommand}`)
  }
}

async function promptApiKey(existingApiKey) {
  if (existingApiKey?.trim()) {
    return existingApiKey.trim()
  }

  const prompt = createPrompt()
  try {
    const apiKey = await prompt.question('请输入 Codex Provider API Key: ')
    if (!apiKey.trim()) {
      throw new Error('API Key 不能为空')
    }
    return apiKey.trim()
  } finally {
    prompt.close()
  }
}

async function confirmProceed() {
  const prompt = createPrompt()
  try {
    const answer = await prompt.question('确认按照以上计划继续？(y/N): ')
    return answer.trim().toLowerCase() === 'y'
  } finally {
    prompt.close()
  }
}

async function executePlan({ snapshot, plan, providerProfile, args }) {
  let execContext = createExecContext(snapshot, null)

  if (plan.runtime.kind === 'use-manager') {
    const installCommand = buildManagerInstallCommand(snapshot, plan.runtime.manager)
    const result = runShell(installCommand, {
      platform: snapshot.platform,
      env: execContext.env,
      inherit: true,
    })
    if (result.status !== 0) {
      throw new Error(`使用 ${plan.runtime.manager} 准备 Node.js 失败`)
    }
    execContext = createExecContext(snapshot, plan.runtime.manager)
  } else if (plan.runtime.kind === 'bootstrap-volta') {
    const bootstrapCommand = bootstrapVolta(snapshot, args.yes)
    const bootstrapResult = runShell(bootstrapCommand, {
      platform: snapshot.platform,
      env: execContext.env,
      inherit: true,
    })
    if (bootstrapResult.status !== 0) {
      throw new Error('引导 Volta 失败')
    }
    execContext = createExecContext(snapshot, 'volta')
    runManagedCommand(snapshot, execContext, 'volta', ['install', 'node'])
  }

  runManagedCommand(snapshot, execContext, 'npm', ['install', '-g', `${CODEX_PACKAGE_NAME}@latest`])
  runManagedCommand(snapshot, execContext, 'codex', ['--version'])

  if (!args.skipConfig) {
    const apiKey = await promptApiKey(args.apiKey)
    const writeResult = writeStandaloneCodexConfig({
      baseUrl: providerProfile.baseUrl,
      apiKey,
    })
    console.log(`✅ 已写入 Codex 配置: ${writeResult.configPath}`)
    console.log(`✅ 已写入 Codex 认证: ${writeResult.authPath}`)
    if (writeResult.configBackup) {
      console.log(`  备份 config.toml: ${writeResult.configBackup}`)
    }
    if (writeResult.authBackup) {
      console.log(`  备份 auth.json: ${writeResult.authBackup}`)
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const providerProfile = resolveProviderProfile(args.provider, args.providerName, args.baseUrl)
  const snapshot = args.fromSnapshot
    ? loadSnapshotFromFile(path.resolve(process.cwd(), args.fromSnapshot))
    : detectSnapshotFromSystem()

  const requiredNodeRange = resolveCodexNodeRequirement(snapshot)
  const plan = planCodexBootstrap({
    snapshot,
    requiredNodeRange,
    providerProfile,
    skipConfig: args.skipConfig,
  })

  if (args.printJson) {
    console.log(
      JSON.stringify(
        {
          snapshot,
          requiredNodeRange,
          minimumBootstrapNodeVersion: MIN_BOOTSTRAP_NODE_VERSION,
          plan,
        },
        null,
        2
      )
    )
    return
  }

  console.log(renderEnvironment(snapshot, requiredNodeRange))
  console.log()
  console.log(renderPlan(plan, { requiredNodeRange, snapshot }))

  if (args.dryRun) {
    console.log('\n[DRY RUN] 未执行任何真实安装或配置动作。')
    return
  }

  if (!args.yes) {
    const confirmed = await confirmProceed()
    if (!confirmed) {
      console.log('已取消。')
      return
    }
  }

  await executePlan({
    snapshot,
    plan,
    providerProfile,
    args,
  })

  console.log('\n🎉 Codex 安装/升级与配置流程完成。')
  console.log('提示：如需首次认证，请运行 `codex` 并按官方提示登录或配置 API Key。')
}

main().catch((error) => {
  console.error(`\n❌ ${error.message}`)
  process.exit(1)
})
