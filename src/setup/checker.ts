/**
 * 环境检查器
 */
import * as semver from 'semver';
import { commandExists, getCommandVersion, getCommandPath } from '../utils/command';
import {
  EnvironmentCheckResult,
  ToolInfo,
  NodeInfo,
  VersionManagerInfo,
  ClaudeCodeRequirements,
  Platform
} from './types';

/**
 * 环境检查器类
 */
export class EnvironmentChecker {
  private requirements: ClaudeCodeRequirements;

  constructor() {
    // TODO: 从官方文档获取实际要求
    // 临时使用假设的要求
    this.requirements = {
      nodeVersion: '>=18.0.0',
      requiredTools: ['node', 'npm']
    };
  }

  /**
   * 执行完整的环境检查
   */
  async check(): Promise<EnvironmentCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // 检查 Claude Code
    const claudeCode = await this.checkClaudeCode();

    // 检查 Node.js（总是检查，即使 Claude Code 已安装）
    const node = await this.checkNode();

    // 检查 npm
    const npm = await this.checkNpm();

    // 检查版本管理器
    const versionManagers = await this.checkVersionManagers();

    // 获取平台信息
    const platform = process.platform as Platform;

    // 分析检查结果，生成问题和建议
    let status: 'ready' | 'needs-setup' | 'warning' | 'error' = 'ready';

    if (!claudeCode.installed) {
      status = 'needs-setup';
      issues.push('Claude Code 未安装');
      suggestions.push('运行 "ccman setup" 安装 Claude Code');
    }

    if (!node.installed) {
      status = 'error';
      issues.push('Node.js 未安装');
      suggestions.push('需要先安装 Node.js (推荐使用 volta 或 nvm)');
    } else if (!node.versionValid) {
      status = node.installed && claudeCode.installed ? 'warning' : 'error';
      issues.push(`Node.js 版本不满足要求 (当前: ${node.version}, 需要: ${this.requirements.nodeVersion})`);
      suggestions.push('升级 Node.js 到推荐版本');
    }

    if (!npm.installed) {
      status = 'error';
      issues.push('npm 未找到');
      suggestions.push('重新安装 Node.js 或修复 npm');
    }

    // 如果所有检查都通过
    if (claudeCode.installed && node.versionValid && npm.installed) {
      status = 'ready';
    }

    return {
      status,
      claudeCode,
      node,
      npm,
      versionManagers,
      requirements: this.requirements,
      platform,
      issues,
      suggestions
    };
  }

  /**
   * 检查 Claude Code
   */
  private async checkClaudeCode(): Promise<ToolInfo> {
    const installed = await commandExists('claude');
    const version = installed ? await getCommandVersion('claude') : null;
    const path = installed ? await getCommandPath('claude') : null;

    return { installed, version, path };
  }

  /**
   * 检查 Node.js
   */
  private async checkNode(): Promise<NodeInfo> {
    const installed = await commandExists('node');
    const version = installed ? await getCommandVersion('node') : null;
    const path = installed ? await getCommandPath('node') : null;

    let versionValid = false;
    if (installed && version) {
      try {
        // 清理版本号格式 (v20.11.0 → 20.11.0)
        const cleanVersion = version.replace(/^v/, '');
        versionValid = semver.satisfies(cleanVersion, this.requirements.nodeVersion);
      } catch (error) {
        // 版本格式无效
        versionValid = false;
      }
    }

    return {
      installed,
      version,
      path,
      versionValid,
      requiredVersion: this.requirements.nodeVersion
    };
  }

  /**
   * 检查 npm
   */
  private async checkNpm(): Promise<ToolInfo> {
    const installed = await commandExists('npm');
    const version = installed ? await getCommandVersion('npm') : null;
    const path = installed ? await getCommandPath('npm') : null;

    return { installed, version, path };
  }

  /**
   * 检查版本管理器
   */
  private async checkVersionManagers(): Promise<VersionManagerInfo> {
    const volta = await commandExists('volta');
    const nvm = await commandExists('nvm');

    return { volta, nvm };
  }

  /**
   * 获取 Claude Code 要求（供外部使用）
   */
  getRequirements(): ClaudeCodeRequirements {
    return this.requirements;
  }
}