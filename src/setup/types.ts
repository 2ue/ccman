/**
 * Setup 模块类型定义
 */

export type Platform = 'darwin' | 'linux' | 'win32';

/**
 * 工具信息
 */
export interface ToolInfo {
  installed: boolean;
  version: string | null;
  path?: string | null;
}

/**
 * Node.js 信息
 */
export interface NodeInfo extends ToolInfo {
  versionValid?: boolean;  // 版本是否满足要求
  requiredVersion?: string; // 要求的版本
}

/**
 * 版本管理器信息
 */
export interface VersionManagerInfo {
  volta: boolean;
  nvm: boolean;
}

/**
 * Claude Code 依赖要求
 */
export interface ClaudeCodeRequirements {
  nodeVersion: string;  // 如 ">=18.0.0"
  requiredTools: string[];  // ['node', 'npm']
}

/**
 * 环境检查结果
 */
export interface EnvironmentCheckResult {
  status: 'ready' | 'needs-setup' | 'warning' | 'error';
  claudeCode: ToolInfo;
  node: NodeInfo;
  npm: ToolInfo;
  versionManagers: VersionManagerInfo;
  requirements: ClaudeCodeRequirements;
  platform: Platform;
  issues: string[];  // 发现的问题列表
  suggestions: string[];  // 建议操作
}

/**
 * 安装步骤
 */
export interface InstallStep {
  name: string;
  description: string;
  command: string;
  manual?: boolean;  // 是否需要手动操作
  optional?: boolean;  // 是否可选
}

/**
 * 安装选项
 */
export interface InstallOption {
  id: string;
  name: string;
  description: string;
  priority: number;
  steps: InstallStep[];
  reason?: string;
}

/**
 * 安装计划
 */
export interface InstallationPlan {
  needsNode: boolean;
  needsClaudeCode: boolean;
  nodeOptions: InstallOption[];
  claudeCodeSteps: InstallStep[];
  selectedNodeOption?: InstallOption;
}

/**
 * 安装结果
 */
export interface InstallationResult {
  success: boolean;
  message: string;
  stepsExecuted: string[];
  stepsFailed: string[];
}

/**
 * 安装执行选项
 */
export interface InstallerOptions {
  dryRun?: boolean;  // 演示模式，不真正执行
  auto?: boolean;    // 自动模式，选择最高优先级
}