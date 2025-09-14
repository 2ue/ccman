import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * 环境配置管理器
 * 根据运行环境加载对应的配置文件
 */
export class EnvConfigManager {
  private static instance: EnvConfigManager | null = null;
  private isLoaded = false;

  private constructor() {}

  static getInstance(): EnvConfigManager {
    if (!EnvConfigManager.instance) {
      EnvConfigManager.instance = new EnvConfigManager();
    }
    return EnvConfigManager.instance;
  }

  /**
   * 加载环境配置
   */
  load(): void {
    if (this.isLoaded) {
      return;
    }

    const environment = this.detectEnvironment();
    
    // 加载对应的环境配置文件
    const configPath = path.join(__dirname, '..', '..', `.env.${environment}`);
    
    try {
      dotenv.config({ path: configPath });
      this.isLoaded = true;
    } catch (error) {
      // 如果环境文件不存在，使用默认配置（生产环境）
      console.warn(`Environment config file not found: ${configPath}, using defaults`);
    }
  }

  /**
   * 检测运行环境
   */
  private detectEnvironment(): 'development' | 'production' {
    // 1. 显式设置的NODE_ENV优先级最高
    if (process.env.NODE_ENV === 'development') {
      return 'development';
    }
    if (process.env.NODE_ENV === 'production') {
      return 'production';
    }

    // 2. 如果是通过npm run dev运行，则为开发环境
    if (process.env.npm_lifecycle_event === 'dev') {
      return 'development';
    }

    // 3. 检查是否在项目目录内通过tsx运行（开发环境特征）
    const currentScript = process.argv[1];
    if (currentScript && currentScript.includes('tsx')) {
      return 'development';
    }

    // 4. 检查是否使用src/cli.ts直接运行（开发环境）
    if (currentScript && currentScript.includes('src/cli.ts')) {
      return 'development';
    }

    // 5. 检查是否在node_modules中运行（可能是npm link）
    if (currentScript && currentScript.includes('/node_modules/') && currentScript.includes('ccman')) {
      return 'development';
    }

    // 6. 默认为生产环境（全局安装、npm start等）
    return 'production';
  }

  /**
   * 获取当前环境
   */
  getCurrentEnvironment(): 'development' | 'production' {
    this.load();
    return this.detectEnvironment();
  }
}

// 全局实例
export const envConfig = EnvConfigManager.getInstance();