/**
 * 直接安装 Node.js 策略
 */
import { InstallStrategy } from './base';
import { InstallOption } from '../types';

export class NodeStrategy extends InstallStrategy {
  async getOptions(): Promise<InstallOption[]> {
    const options: InstallOption[] = [];
    const tools = await this.checkPlatformTools();

    // macOS
    if (this.platform === 'darwin') {
      // 选项1: 官方安装器
      options.push({
        id: 'node-official-macos',
        name: '下载 Node.js 官方安装器（推荐）',
        description: '访问 nodejs.org 下载 LTS 版本',
        priority: 1,
        steps: [
          {
            name: 'download-node',
            description: '访问 https://nodejs.org/',
            command: 'open https://nodejs.org/',
            manual: true
          },
          {
            name: 'install-node',
            description: '下载并安装 LTS 版本 .pkg 文件',
            command: 'manual',
            manual: true
          }
        ]
      });

      // 选项2: Homebrew
      if (tools.brew) {
        options.push({
          id: 'node-brew',
          name: '使用 Homebrew 安装 Node.js',
          description: '通过包管理器安装',
          priority: 2,
          steps: [
            {
              name: 'install-node',
              description: '通过 Homebrew 安装 Node.js 20 LTS',
              command: 'brew install node@20'
            }
          ]
        });
      }
    }

    // Linux
    if (this.platform === 'linux') {
      // Ubuntu/Debian - NodeSource 仓库
      if (tools.apt) {
        options.push({
          id: 'node-nodesource-apt',
          name: '使用 NodeSource 仓库安装（推荐）',
          description: 'Ubuntu/Debian 官方推荐方式',
          priority: 1,
          steps: [
            {
              name: 'setup-repo',
              description: '添加 NodeSource 仓库',
              command: 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -'
            },
            {
              name: 'install-node',
              description: '安装 Node.js',
              command: 'sudo apt-get install -y nodejs'
            }
          ]
        });
      }

      // CentOS/RHEL/Fedora - NodeSource 仓库
      if (tools.yum) {
        options.push({
          id: 'node-nodesource-yum',
          name: '使用 NodeSource 仓库安装（推荐）',
          description: 'CentOS/RHEL/Fedora 官方推荐方式',
          priority: 1,
          steps: [
            {
              name: 'setup-repo',
              description: '添加 NodeSource 仓库',
              command: 'curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -'
            },
            {
              name: 'install-node',
              description: '安装 Node.js',
              command: 'sudo yum install -y nodejs'
            }
          ]
        });
      }
    }

    // Windows
    if (this.platform === 'win32') {
      // 选项1: 官方安装器
      options.push({
        id: 'node-official-windows',
        name: '下载 Node.js 官方安装器（推荐）',
        description: '访问 nodejs.org 下载 LTS 版本',
        priority: 1,
        steps: [
          {
            name: 'download-node',
            description: '访问 https://nodejs.org/',
            command: 'start https://nodejs.org/',
            manual: true
          },
          {
            name: 'install-node',
            description: '下载并运行 LTS 版本 .msi 安装器',
            command: 'manual',
            manual: true
          }
        ]
      });

      // 选项2: Chocolatey
      if (tools.choco) {
        options.push({
          id: 'node-choco',
          name: '使用 Chocolatey 安装 Node.js',
          description: '通过包管理器安装 LTS 版本',
          priority: 2,
          steps: [
            {
              name: 'install-node',
              description: '通过 Chocolatey 安装 Node.js LTS',
              command: 'choco install nodejs-lts'
            }
          ]
        });
      }
    }

    return options;
  }
}