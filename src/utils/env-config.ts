import * as path from 'path';
import * as os from 'os';
import { CCM_CONFIG_DIR, CLAUDE_CONFIG_PATH, STATIC_ENV } from '../config/static-env';

/**
 * 环境配置管理器
 * 使用编译时生成的静态配置
 */
export class EnvConfigManager {
  private static instance: EnvConfigManager | null = null;

  private constructor() {}

  static getInstance(): EnvConfigManager {
    if (!EnvConfigManager.instance) {
      EnvConfigManager.instance = new EnvConfigManager();
    }
    return EnvConfigManager.instance;
  }

  /**
   * 获取CCM配置目录路径
   */
  getCCMConfigDir(): string {
    return this.expandPath(CCM_CONFIG_DIR);
  }

  /**
   * 获取Claude配置文件路径  
   */
  getClaudeConfigPath(): string {
    return this.expandPath(CLAUDE_CONFIG_PATH);
  }

  /**
   * 扩展路径中的~符号
   */
  private expandPath(configPath: string): string {
    return configPath.startsWith('~') 
      ? path.join(os.homedir(), configPath.slice(2))
      : configPath;
  }

  /**
   * 获取当前环境（从编译时确定的NODE_ENV）
   */
  getCurrentEnvironment(): 'development' | 'production' {
    return STATIC_ENV.NODE_ENV as 'development' | 'production';
  }
}

// 全局实例
export const envConfig = EnvConfigManager.getInstance();