/**
 * nvm 安装策略
 */
import { InstallStrategy } from './base';
import { InstallOption } from '../types';

export class NvmStrategy extends InstallStrategy {
  async getOptions(): Promise<InstallOption[]> {
    const options: InstallOption[] = [];
    const tools = await this.checkPlatformTools();

    // macOS / Linux
    if (this.platform === 'darwin' || this.platform === 'linux') {
      // 选项1: 官方脚本（优先）
      options.push({
        id: 'nvm-script',
        name: '使用官方脚本安装 nvm（推荐）',
        description: '快速安装 Node 版本管理器',
        priority: 1,
        steps: [
          {
            name: 'install-nvm',
            description: '下载并安装 nvm',
            command: 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash'
          },
          {
            name: 'reload-shell',
            description: '重新加载 shell 配置',
            command: 'source ~/.bashrc || source ~/.zshrc',
            optional: true
          }
        ]
      });

      // 选项2: Homebrew（如果已安装，但需要额外配置）
      if (tools.brew) {
        options.push({
          id: 'nvm-brew',
          name: '使用 Homebrew 安装 nvm',
          description: '需要手动配置环境变量',
          priority: 2,
          steps: [
            {
              name: 'install-nvm',
              description: '通过 Homebrew 安装 nvm',
              command: 'brew install nvm'
            },
            {
              name: 'create-nvm-dir',
              description: '创建 nvm 目录',
              command: 'mkdir ~/.nvm'
            },
            {
              name: 'configure-env',
              description: '配置环境变量（请查看 brew info nvm）',
              command: 'brew info nvm',
              manual: true
            }
          ]
        });
      }
    }

    // Windows - nvm-windows
    if (this.platform === 'win32') {
      // 选项1: 官方安装器
      options.push({
        id: 'nvm-windows-installer',
        name: '下载 nvm-windows 安装器（推荐）',
        description: 'Windows 版本的 nvm',
        priority: 1,
        steps: [
          {
            name: 'download-nvm',
            description: '访问 https://github.com/coreybutler/nvm-windows/releases',
            command: 'open https://github.com/coreybutler/nvm-windows/releases',
            manual: true
          },
          {
            name: 'install-nvm',
            description: '下载并运行 nvm-setup.exe',
            command: 'manual',
            manual: true
          }
        ]
      });

      // 选项2: Chocolatey
      if (tools.choco) {
        options.push({
          id: 'nvm-windows-choco',
          name: '使用 Chocolatey 安装 nvm-windows',
          description: '通过 Chocolatey 包管理器',
          priority: 2,
          steps: [
            {
              name: 'install-nvm',
              description: '通过 Chocolatey 安装 nvm',
              command: 'choco install nvm'
            }
          ]
        });
      }
    }

    return options;
  }
}