/**
 * Volta 安装策略
 */
import { InstallStrategy } from './base';
import { InstallOption, InstallStep } from '../types';

export class VoltaStrategy extends InstallStrategy {
  async getOptions(): Promise<InstallOption[]> {
    const options: InstallOption[] = [];
    const tools = await this.checkPlatformTools();

    // macOS / Linux
    if (this.platform === 'darwin' || this.platform === 'linux') {
      // 选项1: 官方脚本（优先推荐）
      options.push({
        id: 'volta-script',
        name: '使用官方脚本安装 Volta（推荐）',
        description: '简单快速，一键安装',
        priority: 1,
        steps: [
          {
            name: 'install-volta',
            description: '下载并安装 Volta',
            command: 'curl https://get.volta.sh | bash'
          },
          {
            name: 'reload-shell',
            description: '重新加载 shell 配置',
            command: 'source ~/.bashrc || source ~/.zshrc',
            optional: true
          }
        ]
      });

      // 选项2: Homebrew（如果已安装）
      if (tools.brew) {
        options.push({
          id: 'volta-brew',
          name: '使用 Homebrew 安装 Volta',
          description: '如果你更喜欢使用 Homebrew',
          priority: 2,
          steps: [
            {
              name: 'install-volta',
              description: '通过 Homebrew 安装 Volta',
              command: 'brew install volta'
            }
          ]
        });
      }
    }

    // Windows
    if (this.platform === 'win32') {
      // 选项1: 官方安装器（优先）
      options.push({
        id: 'volta-installer',
        name: '下载 Volta 官方安装器（推荐）',
        description: '访问官网下载 .msi 安装器',
        priority: 1,
        steps: [
          {
            name: 'download-volta',
            description: '访问 https://github.com/volta-cli/volta/releases',
            command: 'open https://github.com/volta-cli/volta/releases',
            manual: true
          },
          {
            name: 'install-volta',
            description: '下载并运行 volta-x.x.x-windows-x86_64.msi',
            command: 'manual',
            manual: true
          }
        ]
      });

      // 选项2: Chocolatey（如果已安装）
      if (tools.choco) {
        options.push({
          id: 'volta-choco',
          name: '使用 Chocolatey 安装 Volta',
          description: '通过 Chocolatey 包管理器',
          priority: 2,
          steps: [
            {
              name: 'install-volta',
              description: '通过 Chocolatey 安装 Volta',
              command: 'choco install volta'
            }
          ]
        });
      }

      // 选项3: Scoop（如果已安装）
      if (tools.scoop) {
        options.push({
          id: 'volta-scoop',
          name: '使用 Scoop 安装 Volta',
          description: '通过 Scoop 包管理器',
          priority: 3,
          steps: [
            {
              name: 'install-volta',
              description: '通过 Scoop 安装 Volta',
              command: 'scoop install volta'
            }
          ]
        });
      }
    }

    return options;
  }
}