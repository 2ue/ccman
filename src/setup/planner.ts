/**
 * 安装计划生成器
 */
import { EnvironmentCheckResult, InstallationPlan, InstallOption, InstallStep } from './types';
import { VoltaStrategy } from './strategies/volta';
import { NvmStrategy } from './strategies/nvm';
import { NodeStrategy } from './strategies/node';

/**
 * 安装计划生成器类
 */
export class InstallationPlanner {
  /**
   * 根据环境检查结果生成安装计划
   */
  async generatePlan(checkResult: EnvironmentCheckResult): Promise<InstallationPlan> {
    const plan: InstallationPlan = {
      needsNode: false,
      needsClaudeCode: false,
      nodeOptions: [],
      claudeCodeSteps: []
    };

    // 判断是否需要安装/升级 Node.js
    if (!checkResult.node.installed || !checkResult.node.versionValid) {
      plan.needsNode = true;
      plan.nodeOptions = await this.generateNodeOptions(checkResult);
    }

    // 判断是否需要安装 Claude Code
    if (!checkResult.claudeCode.installed) {
      plan.needsClaudeCode = true;
      plan.claudeCodeSteps = this.generateClaudeCodeSteps();
    }

    return plan;
  }

  /**
   * 生成 Node.js 安装选项
   */
  private async generateNodeOptions(checkResult: EnvironmentCheckResult): Promise<InstallOption[]> {
    const options: InstallOption[] = [];

    // 场景1: Node.js 已安装但版本过低
    if (checkResult.node.installed && !checkResult.node.versionValid) {
      // 如果已有版本管理器，使用它升级
      if (checkResult.versionManagers.volta) {
        options.push({
          id: 'upgrade-via-volta',
          name: '使用已安装的 Volta 升级 Node.js',
          description: `当前版本 ${checkResult.node.version}，需要 ${checkResult.requirements.nodeVersion}`,
          priority: 1,
          reason: '检测到 Volta 已安装',
          steps: [
            {
              name: 'install-node',
              description: '安装 Node.js 20 LTS',
              command: 'volta install node@20'
            }
          ]
        });
      } else if (checkResult.versionManagers.nvm) {
        options.push({
          id: 'upgrade-via-nvm',
          name: '使用已安装的 nvm 升级 Node.js',
          description: `当前版本 ${checkResult.node.version}，需要 ${checkResult.requirements.nodeVersion}`,
          priority: 1,
          reason: '检测到 nvm 已安装',
          steps: [
            {
              name: 'install-node',
              description: '安装 Node.js 20',
              command: 'nvm install 20'
            },
            {
              name: 'use-node',
              description: '切换到 Node.js 20',
              command: 'nvm use 20'
            },
            {
              name: 'set-default',
              description: '设置为默认版本',
              command: 'nvm alias default 20'
            }
          ]
        });
      } else {
        // 没有版本管理器，提供安装版本管理器的选项
        options.push({
          id: 'upgrade-manual',
          name: '手动升级 Node.js',
          description: '访问 nodejs.org 下载最新版本',
          priority: 3,
          steps: [
            {
              name: 'download-node',
              description: '访问 https://nodejs.org/',
              command: 'open https://nodejs.org/',
              manual: true
            }
          ]
        });

        // 同时提供安装版本管理器的选项
        const voltaOptions = await new VoltaStrategy().getOptions();
        const nvmOptions = await new NvmStrategy().getOptions();
        options.push(...voltaOptions, ...nvmOptions);
      }
    }

    // 场景2: Node.js 未安装
    if (!checkResult.node.installed) {
      // 如果已有版本管理器，使用它安装
      if (checkResult.versionManagers.volta) {
        options.push({
          id: 'install-via-volta',
          name: '使用已安装的 Volta 安装 Node.js',
          description: '推荐使用 Volta 管理 Node.js 版本',
          priority: 1,
          reason: '检测到 Volta 已安装',
          steps: [
            {
              name: 'install-node',
              description: '安装 Node.js 20 LTS',
              command: 'volta install node@20'
            }
          ]
        });
      } else if (checkResult.versionManagers.nvm) {
        options.push({
          id: 'install-via-nvm',
          name: '使用已安装的 nvm 安装 Node.js',
          description: '使用 nvm 管理 Node.js 版本',
          priority: 1,
          reason: '检测到 nvm 已安装',
          steps: [
            {
              name: 'install-node',
              description: '安装 Node.js 20',
              command: 'nvm install 20'
            },
            {
              name: 'use-node',
              description: '切换到 Node.js 20',
              command: 'nvm use 20'
            },
            {
              name: 'set-default',
              description: '设置为默认版本',
              command: 'nvm alias default 20'
            }
          ]
        });
      } else {
        // 没有版本管理器，提供多种安装选项
        // 选项1: 推荐安装 Volta + Node.js
        const voltaStrategy = new VoltaStrategy();
        const voltaOptions = await voltaStrategy.getOptions();

        // 为 Volta 选项添加安装 Node.js 的步骤
        voltaOptions.forEach(option => {
          option.steps.push({
            name: 'install-node',
            description: '安装 Node.js 20 LTS',
            command: 'volta install node@20'
          });
          option.name = option.name.replace('安装 Volta', '安装 Volta + Node.js');
        });

        // 选项2: 安装 nvm + Node.js
        const nvmStrategy = new NvmStrategy();
        const nvmOptions = await nvmStrategy.getOptions();

        nvmOptions.forEach(option => {
          option.priority += 1;  // 降低优先级
          option.steps.push(
            {
              name: 'install-node',
              description: '安装 Node.js 20',
              command: 'nvm install 20'
            },
            {
              name: 'use-node',
              description: '切换到 Node.js 20',
              command: 'nvm use 20'
            },
            {
              name: 'set-default',
              description: '设置为默认版本',
              command: 'nvm alias default 20'
            }
          );
          option.name = option.name.replace('安装 nvm', '安装 nvm + Node.js');
        });

        // 选项3: 直接安装 Node.js（无版本管理）
        const nodeStrategy = new NodeStrategy();
        const nodeOptions = await nodeStrategy.getOptions();
        nodeOptions.forEach(option => {
          option.priority += 2;  // 最低优先级
        });

        options.push(...voltaOptions, ...nvmOptions, ...nodeOptions);
      }
    }

    // 按优先级排序
    options.sort((a, b) => a.priority - b.priority);

    return options;
  }

  /**
   * 生成 Claude Code 安装步骤
   */
  private generateClaudeCodeSteps(): InstallStep[] {
    // TODO: 从官方文档获取实际的安装命令
    // 这里使用假设的安装方式
    return [
      {
        name: 'install-claude-code',
        description: '全局安装 Claude Code CLI',
        command: 'npm install -g @anthropic-ai/claude-code'
      }
    ];
  }
}