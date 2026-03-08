import path from 'node:path'

export const CODEX_PACKAGE_NAME = '@openai/codex'
export const DEFAULT_CODEX_NODE_RANGE = '>=16'
export const MIN_BOOTSTRAP_NODE_VERSION = '18.0.0'
export const SUPPORTED_UNIX_MANAGERS = ['volta', 'fnm', 'nvm', 'mise', 'asdf']
export const SUPPORTED_WINDOWS_MANAGERS = ['volta', 'fnm']

export const PROVIDER_PROFILES = {
  gmn: {
    key: 'gmn',
    title: 'GMN',
    providerName: 'gmn',
    baseUrl: 'https://gmn.chuangzuoli.com',
  },
  gmn1: {
    key: 'gmn1',
    title: 'GMN1',
    providerName: 'gmn',
    baseUrl: 'https://gmncode.cn',
  },
}

export function parseBooleanFlag(value, fallback = false) {
  if (value === undefined) return fallback
  return value === true || value === 'true' || value === '1'
}

export function normalizeVersion(version) {
  if (!version || typeof version !== 'string') {
    return null
  }

  const cleaned = version.trim().replace(/^v/, '')
  const match = cleaned.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/)
  if (!match) return null

  return {
    major: Number(match[1] || 0),
    minor: Number(match[2] || 0),
    patch: Number(match[3] || 0),
  }
}

export function compareVersions(left, right) {
  const leftVersion = typeof left === 'string' ? normalizeVersion(left) : left
  const rightVersion = typeof right === 'string' ? normalizeVersion(right) : right

  if (!leftVersion || !rightVersion) {
    throw new Error('无法比较无效的版本号')
  }

  if (leftVersion.major !== rightVersion.major) return leftVersion.major - rightVersion.major
  if (leftVersion.minor !== rightVersion.minor) return leftVersion.minor - rightVersion.minor
  return leftVersion.patch - rightVersion.patch
}

function isWildcardToken(token) {
  return token === 'x' || token === 'X' || token === '*'
}

function expandRangeToken(token) {
  const normalized = token.trim()
  if (!normalized) return []

  if (normalized.startsWith('^')) {
    const base = normalizeVersion(normalized.slice(1))
    if (!base) return []
    return [
      { operator: '>=', version: base },
      { operator: '<', version: { major: base.major + 1, minor: 0, patch: 0 } },
    ]
  }

  if (normalized.startsWith('~')) {
    const base = normalizeVersion(normalized.slice(1))
    if (!base) return []
    return [
      { operator: '>=', version: base },
      { operator: '<', version: { major: base.major, minor: base.minor + 1, patch: 0 } },
    ]
  }

  const comparatorMatch = normalized.match(/^(<=|>=|<|>|=)?\s*(.+)$/)
  if (!comparatorMatch) return []

  const operator = comparatorMatch[1] || '='
  const rawVersion = comparatorMatch[2].trim()
  const parts = rawVersion.split('.')

  if (parts.some((part) => isWildcardToken(part))) {
    const major = isWildcardToken(parts[0]) ? 0 : Number(parts[0])
    const minor = isWildcardToken(parts[1]) || parts[1] === undefined ? 0 : Number(parts[1])
    const patch = isWildcardToken(parts[2]) || parts[2] === undefined ? 0 : Number(parts[2])

    if (isWildcardToken(parts[0])) {
      return []
    }

    if (parts.length === 1 || isWildcardToken(parts[1]) || parts[1] === undefined) {
      return [
        { operator: '>=', version: { major, minor: 0, patch: 0 } },
        { operator: '<', version: { major: major + 1, minor: 0, patch: 0 } },
      ]
    }

    return [
      { operator: '>=', version: { major, minor, patch: 0 } },
      { operator: '<', version: { major, minor: minor + 1, patch: 0 } },
    ]
  }

  const parsed = normalizeVersion(rawVersion)
  if (!parsed) return []
  return [{ operator, version: parsed }]
}

function evaluateComparator(version, comparator) {
  const comparison = compareVersions(version, comparator.version)

  switch (comparator.operator) {
    case '>':
      return comparison > 0
    case '>=':
      return comparison >= 0
    case '<':
      return comparison < 0
    case '<=':
      return comparison <= 0
    case '=':
      return comparison === 0
    default:
      return false
  }
}

export function satisfiesVersionRange(version, range) {
  const normalized = typeof version === 'string' ? normalizeVersion(version) : version
  if (!normalized || !range || typeof range !== 'string') {
    return false
  }

  const clauses = range
    .split('||')
    .map((item) => item.trim())
    .filter(Boolean)

  if (clauses.length === 0) return false

  return clauses.some((clause) => {
    const comparators = clause
      .split(/\s+/)
      .flatMap((token) => expandRangeToken(token))
      .filter(Boolean)

    if (comparators.length === 0) {
      return false
    }

    return comparators.every((comparator) => evaluateComparator(normalized, comparator))
  })
}

export function pickExistingManager(snapshot) {
  const managerOrder =
    snapshot.platform === 'win32' ? SUPPORTED_WINDOWS_MANAGERS : SUPPORTED_UNIX_MANAGERS

  return managerOrder.find((manager) => snapshot.tools?.[manager]) || null
}

export function resolveProviderProfile(profileKey, providerNameArg, baseUrlArg) {
  const profile = PROVIDER_PROFILES[profileKey] || PROVIDER_PROFILES.gmn
  return {
    profileKey: profile.key,
    profileTitle: profile.title,
    providerName: providerNameArg?.trim() || profile.providerName,
    baseUrl: baseUrlArg?.trim() || profile.baseUrl,
  }
}

export function planCodexBootstrap({
  snapshot,
  requiredNodeRange,
  preferredManager = 'auto',
  providerProfile,
  skipConfig = false,
}) {
  const nodeVersion = snapshot.node?.version || null
  const nodeCompatible = nodeVersion ? satisfiesVersionRange(nodeVersion, requiredNodeRange) : false
  const existingManager = pickExistingManager(snapshot)
  const selectedManager =
    preferredManager && preferredManager !== 'auto' ? preferredManager : existingManager

  const plan = {
    runtime: null,
    codex: null,
    config: null,
    warnings: [],
    steps: [],
  }

  if (nodeCompatible) {
    plan.runtime = {
      kind: 'reuse-node',
      manager: null,
      reason: `检测到兼容的 Node.js ${nodeVersion}`,
    }
    plan.steps.push({
      id: 'runtime',
      title: '复用现有 Node.js',
      detail: `当前版本 ${nodeVersion} 满足 Codex 运行要求 ${requiredNodeRange}`,
    })
  } else if (selectedManager) {
    plan.runtime = {
      kind: 'use-manager',
      manager: selectedManager,
      reason: nodeVersion
        ? `当前 Node.js ${nodeVersion} 不满足 ${requiredNodeRange}，改为复用现有 ${selectedManager}`
        : `未检测到可用 Node.js，改为复用现有 ${selectedManager}`,
    }
    plan.steps.push({
      id: 'runtime',
      title: `使用 ${selectedManager} 准备 Node.js`,
      detail: nodeVersion
        ? `升级/切换到满足 ${requiredNodeRange} 的 Node.js`
        : `安装满足 ${requiredNodeRange} 的 Node.js`,
    })
  } else {
    plan.runtime = {
      kind: 'bootstrap-volta',
      manager: 'volta',
      reason: nodeVersion
        ? `当前 Node.js ${nodeVersion} 不满足 ${requiredNodeRange}，推荐引导 Volta`
        : '未检测到 Node.js 或现有版本管理器，推荐引导 Volta',
    }
    plan.steps.push({
      id: 'runtime',
      title: '引导 Volta 并安装 Node.js',
      detail: `使用推荐路线为当前用户安装 Volta，并准备满足 ${requiredNodeRange} 的 Node.js`,
    })
  }

  plan.codex = {
    kind: snapshot.codex?.installed ? 'upgrade-or-verify' : 'install',
    currentVersion: snapshot.codex?.version || null,
  }
  plan.steps.push({
    id: 'codex',
    title: snapshot.codex?.installed ? '升级或校验 Codex CLI' : '安装 Codex CLI',
    detail: snapshot.codex?.installed
      ? `检测到现有 Codex ${snapshot.codex.version || 'unknown'}，执行升级并校验`
      : `通过 npm 安装 ${CODEX_PACKAGE_NAME}@latest，并执行版本校验`,
  })

  plan.config = skipConfig
    ? { kind: 'skip' }
    : {
        kind: 'configure',
        providerName: providerProfile.providerName,
        baseUrl: providerProfile.baseUrl,
      }

  if (skipConfig) {
    plan.steps.push({
      id: 'config',
      title: '跳过 Codex 配置',
      detail: '根据参数选择，仅安装/升级 Codex CLI',
    })
  } else {
    plan.steps.push({
      id: 'config',
      title: '写入 Codex 配置',
      detail: `使用现有 ccman Codex Writer 写入 provider=${providerProfile.providerName} baseUrl=${providerProfile.baseUrl}`,
    })
  }

  if (snapshot.platform === 'win32') {
    plan.warnings.push('Windows 上 Codex 官方支持仍偏实验性质，建议优先在 WSL 中使用。')
  }

  if (existingManager && preferredManager === 'auto') {
    plan.warnings.push(`已检测到版本管理器 ${existingManager}，优先复用现有管理器。`)
  }

  if (
    !snapshot.tools?.curl &&
    plan.runtime.kind === 'bootstrap-volta' &&
    snapshot.platform !== 'win32'
  ) {
    plan.warnings.push('未检测到 curl，Unix 引导 Volta 可能失败。')
  }

  return plan
}

export function renderPlan(plan, { requiredNodeRange, snapshot }) {
  const lines = []
  lines.push('Codex 安装计划')
  lines.push(`- 平台: ${snapshot.platform}/${snapshot.arch}`)
  lines.push(`- Shell: ${snapshot.shell || 'unknown'}`)
  lines.push(`- Node 要求: ${requiredNodeRange}`)
  lines.push(`- 当前 Node: ${snapshot.node?.version || '未安装'}`)
  lines.push(`- 当前 npm: ${snapshot.npm?.version || '未安装'}`)
  lines.push(`- 当前 Codex: ${snapshot.codex?.version || '未安装'}`)
  lines.push('')

  for (const step of plan.steps) {
    lines.push(`• ${step.title}`)
    lines.push(`  ${step.detail}`)
  }

  if (plan.warnings.length > 0) {
    lines.push('')
    lines.push('注意事项:')
    for (const warning of plan.warnings) {
      lines.push(`- ${warning}`)
    }
  }

  return lines.join('\n')
}

export function resolveScriptPath(...segments) {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), ...segments)
}
