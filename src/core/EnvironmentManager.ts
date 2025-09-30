/**
 * 环境管理器
 * 负责检查和管理 Claude Code 运行环境
 */
import { EnvironmentChecker } from '../setup/checker';
import { InstallationPlanner } from '../setup/planner';
import { EnvironmentCheckResult, InstallationPlan } from '../setup/types';

/**
 * 环境管理器类
 */
export class EnvironmentManager {
  private checker: EnvironmentChecker;
  private planner: InstallationPlanner;

  constructor() {
    this.checker = new EnvironmentChecker();
    this.planner = new InstallationPlanner();
  }

  /**
   * 检查环境状态
   */
  async checkEnvironment(): Promise<EnvironmentCheckResult> {
    return await this.checker.check();
  }

  /**
   * 生成安装计划
   */
  async generateInstallPlan(checkResult: EnvironmentCheckResult): Promise<InstallationPlan> {
    return await this.planner.generatePlan(checkResult);
  }

  /**
   * 快速验证 Claude Code 是否可用
   * 用于在关键操作前进行检查
   */
  async verifyClaudeCode(): Promise<boolean> {
    const result = await this.checkEnvironment();
    return result.status === 'ready';
  }

  /**
   * 获取环境要求
   */
  getRequirements() {
    return this.checker.getRequirements();
  }
}