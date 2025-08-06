import * as fse from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { ShellEnvVars, ShellWriteResult, ShellType } from '../types';
import { CONFIG, getConfigDir, getShellRCFile } from '../config/constants';

export class ShellManager {
  private readonly homeDir: string;
  private readonly ccmanDir: string;
  private readonly ccmanrcPath: string;
  
  constructor() {
    this.homeDir = os.homedir();
    this.ccmanDir = getConfigDir();
    this.ccmanrcPath = getShellRCFile();
  }

  /**
   * 写入环境变量到 CCMan 配置文件并更新 shell 引用
   */
  async writeToShell(envVars: ShellEnvVars, envName?: string): Promise<ShellWriteResult> {
    try {
      // 1. 写入环境变量到独立的 ccmanrc 文件（通常不会有权限问题）
      await this.writeCCMANRC(envVars, envName);
      
      // 2. 检查shell配置文件权限
      const shellPermissionCheck = this.checkShellWritePermissions();
      
      // 3. 尝试更新 shell 配置文件引用
      if (shellPermissionCheck.hasWritableShellConfig) {
        try {
          const shellUpdateResult = await this.ensureShellReference();
          return {
            success: true,
            filePath: this.ccmanrcPath,
            message: `环境变量已写入 ${this.ccmanrcPath}${shellUpdateResult.updated ? ` 并${shellUpdateResult.action}shell引用` : ''}`
          };
        } catch (error) {
          // Shell引用失败但有可写配置文件时，提供具体的手动指导
          return this.createManualConfigResult(shellPermissionCheck, String(error));
        }
      } else {
        // 没有可写的shell配置文件，提供完整的手动配置指导
        return this.createManualConfigResult(shellPermissionCheck);
      }
    } catch (error) {
      return {
        success: false,
        filePath: this.ccmanrcPath,
        message: '写入环境变量失败',
        error: String(error)
      };
    }
  }

  /**
   * 创建手动配置结果
   */
  private createManualConfigResult(
    shellPermissionCheck: { shellConfigAccess: { file: string; writable: boolean; error?: string }[] }, 
    shellError?: string
  ): ShellWriteResult {
    const reference = this.generateShellReference().trim();
    const writableFiles = shellPermissionCheck.shellConfigAccess.filter(f => f.writable);
    const nonWritableFiles = shellPermissionCheck.shellConfigAccess.filter(f => !f.writable);
    
    let message = `环境变量已写入 ${this.ccmanrcPath}，但需要手动配置shell引用。\n\n`;
    
    if (writableFiles.length > 0) {
      message += `推荐添加到以下文件之一：\n`;
      writableFiles.forEach(f => {
        message += `  ✅ ${f.file}\n`;
      });
    }
    
    if (nonWritableFiles.length > 0) {
      message += `以下文件无写入权限：\n`;
      nonWritableFiles.forEach(f => {
        message += `  ❌ ${f.file} (${f.error})\n`;
      });
      message += `\n可尝试修复权限：\n`;
      nonWritableFiles.forEach(f => {
        if (f.error === '无写入权限') {
          message += `  chmod 644 ${f.file}\n`;
        }
      });
    }
    
    message += `\n需要手动添加的内容：\n${reference}`;
    
    return {
      success: true, // ccmanrc写入成功，只是需要手动配置
      filePath: this.ccmanrcPath,
      message,
      error: shellError ? `Shell配置自动更新失败: ${shellError}` : '所有shell配置文件都无写入权限'
    };
  }

  /**
   * 检查shell配置文件写入权限
   */
  private checkShellWritePermissions(): {
    hasWritableShellConfig: boolean;
    shellConfigAccess: { file: string; writable: boolean; error?: string }[];
  } {
    const result = {
      hasWritableShellConfig: false,
      shellConfigAccess: [] as { file: string; writable: boolean; error?: string }[]
    };

    const shellType = this.detectShell();
    const configFiles = this.getShellConfigFiles(shellType);
    
    for (const configFile of configFiles) {
      const fileCheck = { file: configFile, writable: false, error: undefined as string | undefined };
      
      try {
        if (fse.pathExistsSync(configFile)) {
          // 文件存在，检查写入权限
          fse.accessSync(configFile, fse.constants.W_OK);
          fileCheck.writable = true;
          result.hasWritableShellConfig = true;
        } else {
          // 文件不存在，检查父目录权限（能否创建文件）
          const dir = path.dirname(configFile);
          if (fse.pathExistsSync(dir)) {
            fse.accessSync(dir, fse.constants.W_OK);
            fileCheck.writable = true;
            result.hasWritableShellConfig = true;
          } else {
            fileCheck.error = '目录不存在';
          }
        }
      } catch (error: any) {
        fileCheck.error = `无写入权限`;
      }
      
      result.shellConfigAccess.push(fileCheck);
    }

    return result;
  }

  /**
   * 写入 ccmanrc 文件
   */
  private async writeCCMANRC(envVars: ShellEnvVars, envName?: string): Promise<void> {
    // 确保 .ccman 目录存在
    fse.ensureDirSync(this.ccmanDir);

    const content = this.generateExportStatements(envVars, envName);
    await fse.writeFile(this.ccmanrcPath, content, 'utf8');
  }

  /**
   * 确保 shell 配置文件中有对 ccmanrc 的引用
   */
  private async ensureShellReference(): Promise<{ updated: boolean; action: string; filePath?: string }> {
    const shellType = this.detectShell();
    const configFiles = this.getShellConfigFiles(shellType);
    
    // 检查是否已经有引用
    for (const configFile of configFiles) {
      if (fse.pathExistsSync(configFile)) {
        const content = fse.readFileSync(configFile, 'utf8');
        if (this.hasShellReference(content)) {
          return { updated: false, action: 'already exists' };
        }
      }
    }

    // 添加引用到主配置文件
    const primaryConfigFile = configFiles[0];
    try {
      await this.addShellReference(primaryConfigFile);
      return { 
        updated: true, 
        action: 'added', 
        filePath: primaryConfigFile 
      };
    } catch (error) {
      // 尝试其他配置文件
      for (let i = 1; i < configFiles.length; i++) {
        try {
          await this.addShellReference(configFiles[i]);
          return { 
            updated: true, 
            action: 'added (fallback)', 
            filePath: configFiles[i] 
          };
        } catch (fallbackError) {
          continue;
        }
      }
      throw new Error('Failed to add shell reference to any configuration file');
    }
  }

  /**
   * 添加 shell 引用到配置文件
   */
  private async addShellReference(configFilePath: string): Promise<void> {
    // 确保目录存在
    const dir = path.dirname(configFilePath);
    fse.ensureDirSync(dir);

    let content = '';
    if (fse.pathExistsSync(configFilePath)) {
      try {
        content = fse.readFileSync(configFilePath, 'utf8');
      } catch (error: any) {
        if (error.code === 'EACCES' || error.code === 'EPERM') {
          throw new Error(`无权限读取shell配置文件 ${configFilePath}`);
        }
        throw error;
      }
    }

    // 添加对 ccmanrc 的引用
    const reference = this.generateShellReference();
    content += reference;

    try {
      await fse.writeFile(configFilePath, content, 'utf8');
    } catch (error: any) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`无权限修改shell配置文件 ${configFilePath}。\n建议：\n  1. 检查文件权限：chmod 644 ${configFilePath}\n  2. 或手动添加以下内容到该文件：\n${reference.trim()}`);
      }
      throw error;
    }
  }

  /**
   * 生成 shell 引用代码
   */
  private generateShellReference(): string {
    return `
# ${CONFIG.APP_FULL_NAME} - Auto Generated Reference
# This line sources ${CONFIG.APP_NAME} environment variables from ${this.ccmanrcPath}
[ -f "${this.ccmanrcPath}" ] && source "${this.ccmanrcPath}"
# End ${CONFIG.APP_NAME} Reference
`;
  }

  /**
   * 检查是否已经有 shell 引用
   */
  private hasShellReference(content: string): boolean {
    return content.includes(`# ${CONFIG.APP_FULL_NAME} - Auto Generated Reference`) || 
           content.includes(this.ccmanrcPath);
  }

  /**
   * 从 shell 配置文件中清除 ccmanrc 引用和 ccmanrc 文件
   */
  async clearFromShell(): Promise<ShellWriteResult> {
    let clearedAny = false;
    let lastError: string | undefined;
    
    // 1. 删除 ccmanrc 文件
    if (fse.pathExistsSync(this.ccmanrcPath)) {
      try {
        fse.removeSync(this.ccmanrcPath);
        clearedAny = true;
      } catch (error) {
        lastError = String(error);
      }
    }

    // 2. 从 shell 配置文件中移除引用
    const shellType = this.detectShell();
    const configFiles = this.getShellConfigFiles(shellType);
    
    for (const configFile of configFiles) {
      try {
        if (fse.pathExistsSync(configFile)) {
          await this.removeShellReference(configFile);
          clearedAny = true;
        }
      } catch (error) {
        lastError = String(error);
      }
    }
    
    if (clearedAny) {
      return {
        success: true,
        filePath: this.ccmanrcPath,
        message: 'Environment variables and shell references cleared'
      };
    } else {
      return {
        success: false,
        filePath: this.ccmanrcPath,
        message: 'Failed to clear environment variables',
        error: lastError
      };
    }
  }

  /**
   * 从配置文件中移除 shell 引用
   */
  private async removeShellReference(filePath: string): Promise<void> {
    if (!fse.pathExistsSync(filePath)) {
      return;
    }

    const content = fse.readFileSync(filePath, 'utf8');
    const cleanedContent = this.removeShellReferenceFromContent(content);
    
    await fse.writeFile(filePath, cleanedContent, 'utf8');
  }

  /**
   * 从内容中移除 shell 引用部分
   */
  private removeShellReferenceFromContent(content: string): string {
    const startMarker = `# ${CONFIG.APP_FULL_NAME} - Auto Generated Reference`;
    const endMarker = `# End ${CONFIG.APP_NAME} Reference`;
    
    const lines = content.split('\n');
    const filteredLines: string[] = [];
    let inCCMSection = false;
    
    for (const line of lines) {
      if (line.includes(startMarker)) {
        inCCMSection = true;
        continue;
      }
      
      if (line.includes(endMarker)) {
        inCCMSection = false;
        continue;
      }
      
      if (!inCCMSection) {
        filteredLines.push(line);
      }
    }
    
    return filteredLines.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  /**
   * 检测当前使用的 shell 类型
   */
  detectShell(): ShellType {
    const shell = process.env.SHELL || '';
    
    if (shell.includes('zsh')) {
      return 'zsh';
    } else if (shell.includes('bash')) {
      return 'bash';
    } else if (shell.includes('fish')) {
      return 'fish';
    } else {
      return 'unknown';
    }
  }

  /**
   * 获取 shell 配置文件路径列表
   */
  getShellConfigFiles(shellType: ShellType): string[] {
    const configFiles: string[] = [];
    
    switch (shellType) {
      case 'zsh':
        configFiles.push(
          path.join(this.homeDir, '.zshrc'),
          path.join(this.homeDir, '.zprofile')
        );
        break;
      case 'bash':
        configFiles.push(
          path.join(this.homeDir, '.bashrc'),
          path.join(this.homeDir, '.bash_profile'),
          path.join(this.homeDir, '.profile')
        );
        break;
      case 'fish':
        configFiles.push(
          path.join(this.homeDir, '.config/fish/config.fish')
        );
        break;
      default:
        // 默认尝试常见的配置文件
        configFiles.push(
          path.join(this.homeDir, '.zshrc'),
          path.join(this.homeDir, '.bashrc'),
          path.join(this.homeDir, '.profile')
        );
    }
    
    return configFiles;
  }

  /**
   * 生成环境变量导出语句
   */
  generateExportStatements(envVars: ShellEnvVars, envName?: string): string {
    const now = new Date();
    const timestamp = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0') + ':' + 
      String(now.getSeconds()).padStart(2, '0');
    const nameComment = envName ? `# Environment: ${envName}` : '';
    
    return `
# ${CONFIG.APP_FULL_NAME} Environment Variables - Auto Generated
# Generated at: ${timestamp}${nameComment ? '\n' + nameComment : ''}
export ${CONFIG.ENV_VARS.BASE_URL}="${envVars.ANTHROPIC_BASE_URL}"
export ${CONFIG.ENV_VARS.AUTH_TOKEN}="${envVars.ANTHROPIC_AUTH_TOKEN}"
# End ${CONFIG.APP_NAME} Environment Variables
`;
  }

  /**
   * 检查是否已经写入了环境变量
   */
  hasEnvVarsInShell(): boolean {
    // 检查 ccmanrc 文件是否存在
    if (fse.pathExistsSync(this.ccmanrcPath)) {
      return true;
    }
    
    // 检查 shell 配置文件中是否有引用
    const shellType = this.detectShell();
    const configFiles = this.getShellConfigFiles(shellType);
    
    for (const configFile of configFiles) {
      if (fse.pathExistsSync(configFile)) {
        const content = fse.readFileSync(configFile, 'utf8');
        if (this.hasShellReference(content)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 自动 source shell 配置文件
   */
  async autoSourceShell(): Promise<ShellWriteResult> {
    const shellType = this.detectShell();
    const configFiles = this.getShellConfigFiles(shellType);
    
    // 找到第一个存在的配置文件
    const activeConfigFile = configFiles.find(file => fse.pathExistsSync(file));
    
    if (!activeConfigFile) {
      return {
        success: false,
        filePath: configFiles.join(', '),
        message: 'No shell configuration file found to source',
        error: 'Configuration file not found'
      };
    }

    try {
      // 使用子进程执行 source 命令
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // 根据不同 shell 类型使用不同的 source 命令
      let sourceCommand: string;
      switch (shellType) {
        case 'zsh':
          sourceCommand = `zsh -c "source ${activeConfigFile}"`;
          break;
        case 'bash':
          sourceCommand = `bash -c "source ${activeConfigFile}"`;
          break;
        case 'fish':
          sourceCommand = `fish -c "source ${activeConfigFile}"`;
          break;
        default:
          sourceCommand = `bash -c "source ${activeConfigFile}"`;
      }

      await execAsync(sourceCommand);
      
      return {
        success: true,
        filePath: activeConfigFile,
        message: `Successfully sourced ${activeConfigFile}`
      };
    } catch (error) {
      return {
        success: false,
        filePath: activeConfigFile,
        message: 'Failed to source shell configuration file',
        error: String(error)
      };
    }
  }

  /**
   * 获取当前 shell 信息
   */
  getShellInfo(): {
    shellType: ShellType;
    shellPath: string;
    configFiles: string[];
    activeConfigFile?: string;
  } {
    const shellType = this.detectShell();
    const configFiles = this.getShellConfigFiles(shellType);
    
    // 找到第一个存在的配置文件作为活动配置文件
    const activeConfigFile = configFiles.find(file => fse.pathExistsSync(file));
    
    return {
      shellType,
      shellPath: process.env.SHELL || 'unknown',
      configFiles,
      activeConfigFile
    };
  }
}