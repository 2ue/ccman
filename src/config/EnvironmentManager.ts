import { ConfigManager } from '../config/ConfigManager';
import { ShellManager } from '../shell/ShellManager';
import { ClaudeEnv, ShellEnvVars, AddEnvOptions, EnvironmentListItem } from '../types';

export class EnvironmentManager {
  private configManager: ConfigManager;
  private shellManager: ShellManager;

  constructor() {
    this.configManager = new ConfigManager();
    this.shellManager = new ShellManager();
  }

  /**
   * 添加环境变量组
   */
  async addEnvironment(options: AddEnvOptions): Promise<ClaudeEnv> {
    // 验证输入
    this.validateEnvironmentInput(options);
    
    // 添加环境到配置
    const newEnv = this.configManager.addEnvironment(options);
    
    // 如果启用自动写入 shell，则写入
    const settings = this.configManager.getSettings();
    if (options.autoWriteShell ?? settings.autoWriteShell) {
      try {
        await this.shellManager.writeToShell(this.getEnvVars(newEnv), newEnv.name);
      } catch (error) {
        // 写入失败不应该影响添加环境，只记录错误
        console.warn(`Warning: Failed to write to shell config: ${error}`);
      }
    }

    return newEnv;
  }

  /**
   * 删除环境变量组
   */
  async removeEnvironment(name: string): Promise<void> {
    if (!this.configManager.hasEnvironment(name)) {
      throw new Error(`Environment "${name}" not found`);
    }

    this.configManager.removeEnvironment(name);
    
    // 如果删除的是当前环境，尝试清理 shell 配置
    const currentEnv = this.configManager.getCurrentEnvironment();
    if (!currentEnv) {
      try {
        await this.shellManager.clearFromShell();
      } catch (error) {
        console.warn(`Warning: Failed to clear shell config: ${error}`);
      }
    }
  }

  /**
   * 设置使用的环境变量组
   */
  async useEnvironment(name: string, options?: { autoWriteShell?: boolean; autoSource?: boolean }): Promise<{
    env: ClaudeEnv;
    shellWriteResult?: any;
    sourceResult?: any;
  }> {
    const env = this.configManager.setCurrentEnvironment(name);
    
    // 根据参数或全局设置决定是否写入 shell
    const settings = this.configManager.getSettings();
    const shouldWriteShell = options?.autoWriteShell ?? settings.autoWriteShell;
    
    let shellWriteResult;
    let sourceResult;
    
    if (shouldWriteShell) {
      try {
        const envVars = this.getEnvVars(env);
        shellWriteResult = await this.shellManager.writeToShell(envVars, env.name);
        
        // 如果指定了自动 source，则执行自动 source
        if (options?.autoSource) {
          sourceResult = await this.shellManager.autoSourceShell();
        }
      } catch (error) {
        throw new Error(`Failed to write environment variables to shell: ${error}`);
      }
    }

    return {
      env,
      shellWriteResult,
      sourceResult
    };
  }

  /**
   * 获取所有环境变量组
   */
  listEnvironments(): EnvironmentListItem[] {
    return this.configManager.listEnvironments();
  }

  /**
   * 获取当前使用的环境变量组
   */
  getCurrentEnvironment(): ClaudeEnv | null {
    return this.configManager.getCurrentEnvironment();
  }

  /**
   * 获取指定环境
   */
  getEnvironment(name: string): ClaudeEnv | null {
    return this.configManager.getEnvironment(name);
  }

  /**
   * 更新环境
   */
  async updateEnvironment(
    name: string, 
    updates: { baseUrl?: string; apiKey?: string },
    autoWriteShell?: boolean
  ): Promise<ClaudeEnv> {
    const updatedEnv = this.configManager.updateEnvironment(name, updates);
    
    // 如果更新的是当前环境，且启用自动写入，则更新 shell 配置
    const currentEnv = this.configManager.getCurrentEnvironment();
    if (currentEnv?.name === name) {
      const settings = this.configManager.getSettings();
      const shouldWriteShell = autoWriteShell ?? settings.autoWriteShell;
      
      if (shouldWriteShell) {
        try {
          const envVars = this.getEnvVars(updatedEnv);
          await this.shellManager.writeToShell(envVars, updatedEnv.name);
        } catch (error) {
          console.warn(`Warning: Failed to update shell config: ${error}`);
        }
      }
    }

    return updatedEnv;
  }

  /**
   * 生成环境变量脚本
   */
  generateEnvScript(): string {
    const currentEnv = this.configManager.getCurrentEnvironment();
    
    if (!currentEnv) {
      throw new Error('No environment is currently active');
    }

    const envVars = this.getEnvVars(currentEnv);
    
    const now = new Date();
    const timestamp = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0') + ':' + 
      String(now.getSeconds()).padStart(2, '0');

    const script = `#!/bin/bash
# CCM Environment Variables for: ${currentEnv.name}
# Generated at: ${timestamp}

export ANTHROPIC_BASE_URL="${envVars.ANTHROPIC_BASE_URL}"
export ANTHROPIC_AUTH_TOKEN="${envVars.ANTHROPIC_AUTH_TOKEN}"

echo "Environment variables set for: ${currentEnv.name}"
`;

    return script;
  }

  /**
   * 测试环境连接
   */
  async testEnvironment(name?: string): Promise<{ success: boolean; message: string; error?: string }> {
    const env = name ? this.getEnvironment(name) : this.getCurrentEnvironment();
    
    if (!env) {
      return {
        success: false,
        message: `Environment ${name ? `"${name}"` : 'current'} not found`
      };
    }

    // 简单验证 URL 格式和 API Key 存在
    try {
      new URL(env.baseUrl);
      
      if (!env.apiKey || env.apiKey.trim().length === 0) {
        return {
          success: false,
          message: `Environment "${env.name}" has empty API key`
        };
      }

      return {
        success: true,
        message: `Environment "${env.name}" configuration is valid`
      };
    } catch (error) {
      return {
        success: false,
        message: `Environment "${env.name}" has invalid base URL`,
        error: String(error)
      };
    }
  }

  /**
   * 获取环境统计信息
   */
  getStats(): {
    totalEnvironments: number;
    currentEnvironment: string | null;
    hasShellIntegration: boolean;
  } {
    const currentEnv = this.configManager.getCurrentEnvironment();
    const settings = this.configManager.getSettings();
    
    return {
      totalEnvironments: this.configManager.getEnvironmentCount(),
      currentEnvironment: currentEnv?.name || null,
      hasShellIntegration: settings.autoWriteShell
    };
  }

  /**
   * 将 ClaudeEnv 转换为 shell 环境变量格式
   */
  private getEnvVars(env: ClaudeEnv): ShellEnvVars {
    return {
      ANTHROPIC_BASE_URL: env.baseUrl,
      ANTHROPIC_AUTH_TOKEN: env.apiKey
    };
  }

  /**
   * 获取 Shell Manager 实例（用于高级操作）
   */
  getShellManager(): ShellManager {
    return this.shellManager;
  }

  /**
   * 清除所有环境和配置
   */
  async clearAll(): Promise<{ success: boolean; message: string; details: string[] }> {
    const details: string[] = [];
    let hasErrors = false;

    try {
      // 1. 清除 shell 配置
      try {
        const shellResult = await this.shellManager.clearFromShell();
        if (shellResult.success) {
          details.push('✓ Shell configuration cleared');
        } else {
          details.push(`⚠ Shell cleanup warning: ${shellResult.message}`);
        }
      } catch (error) {
        details.push(`✗ Shell cleanup failed: ${error}`);
        hasErrors = true;
      }

      // 2. 清除所有环境配置
      try {
        this.configManager.clearAll();
        details.push('✓ All environments removed');
        details.push('✓ Configuration reset');
      } catch (error) {
        details.push(`✗ Configuration cleanup failed: ${error}`);
        hasErrors = true;
      }

      const message = hasErrors 
        ? 'CCM cleared with some warnings (see details)'
        : 'CCM completely cleared - all environments and shell integration removed';

      return {
        success: !hasErrors,
        message,
        details
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to clear CCM: ${error}`,
        details: ['✗ Unexpected error during cleanup']
      };
    }
  }
  private validateEnvironmentInput(options: AddEnvOptions): void {
    if (!options.name || options.name.trim().length === 0) {
      throw new Error('Environment name is required');
    }

    if (!options.baseUrl || options.baseUrl.trim().length === 0) {
      throw new Error('Base URL is required');
    }

    if (!options.apiKey || options.apiKey.trim().length === 0) {
      throw new Error('API key is required');
    }

    // 验证 URL 格式
    try {
      new URL(options.baseUrl);
    } catch (error) {
      throw new Error('Invalid base URL format');
    }

    // 验证环境名称格式（只允许字母、数字、下划线、连字符）
    if (!/^[a-zA-Z0-9_-]+$/.test(options.name)) {
      throw new Error('Environment name can only contain letters, numbers, underscores, and hyphens');
    }
  }
}