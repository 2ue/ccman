import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Config, ClaudeEnv, GlobalSettings, AddEnvOptions, EnvironmentListItem } from '../types';

export class ConfigManager {
  private readonly configDir: string;
  private readonly configFile: string;
  
  constructor() {
    this.configDir = path.join(os.homedir(), '.ccm');
    this.configFile = path.join(this.configDir, 'config.json');
    this.ensureConfigDir();
  }

  /**
   * 确保配置目录存在
   */
  private ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  /**
   * 获取配置
   */
  getConfig(): Config {
    if (!fs.existsSync(this.configFile)) {
      const defaultConfig: Config = {
        current: null,
        environments: {},
        settings: {
          autoWriteShell: true,
          preferredShell: 'auto'
        }
      };
      this.saveConfig(defaultConfig);
      return defaultConfig;
    }

    try {
      const content = fs.readFileSync(this.configFile, 'utf8');
      return JSON.parse(content) as Config;
    } catch (error) {
      throw new Error(`Failed to read config: ${error}`);
    }
  }

  /**
   * 保存配置
   */
  saveConfig(config: Config): void {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
    }
  }

  /**
   * 添加环境
   */
  addEnvironment(options: AddEnvOptions): ClaudeEnv {
    const config = this.getConfig();
    
    if (config.environments[options.name]) {
      throw new Error(`Environment "${options.name}" already exists`);
    }

    const newEnv: ClaudeEnv = {
      name: options.name,
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      createdAt: new Date().toISOString()
    };

    config.environments[options.name] = newEnv;
    
    // 如果是第一个环境，设为当前环境
    if (!config.current) {
      config.current = options.name;
    }

    this.saveConfig(config);
    return newEnv;
  }

  /**
   * 删除环境
   */
  removeEnvironment(name: string): void {
    const config = this.getConfig();
    
    if (!config.environments[name]) {
      throw new Error(`Environment "${name}" not found`);
    }

    delete config.environments[name];
    
    // 如果删除的是当前环境，清空当前环境或切换到第一个可用环境
    if (config.current === name) {
      const remainingEnvs = Object.keys(config.environments);
      config.current = remainingEnvs.length > 0 ? remainingEnvs[0] : null;
    }

    this.saveConfig(config);
  }

  /**
   * 设置当前环境
   */
  setCurrentEnvironment(name: string): ClaudeEnv {
    const config = this.getConfig();
    
    if (!config.environments[name]) {
      throw new Error(`Environment "${name}" not found`);
    }

    config.current = name;
    config.environments[name].lastUsed = new Date().toISOString();
    this.saveConfig(config);
    
    return config.environments[name];
  }

  /**
   * 获取当前环境
   */
  getCurrentEnvironment(): ClaudeEnv | null {
    const config = this.getConfig();
    
    if (!config.current || !config.environments[config.current]) {
      return null;
    }

    return config.environments[config.current];
  }

  /**
   * 获取所有环境列表
   */
  listEnvironments(): EnvironmentListItem[] {
    const config = this.getConfig();
    
    return Object.values(config.environments).map(env => ({
      ...env,
      isCurrent: env.name === config.current
    }));
  }

  /**
   * 获取指定环境
   */
  getEnvironment(name: string): ClaudeEnv | null {
    const config = this.getConfig();
    return config.environments[name] || null;
  }

  /**
   * 更新环境
   */
  updateEnvironment(name: string, updates: Partial<Omit<ClaudeEnv, 'name' | 'createdAt'>>): ClaudeEnv {
    const config = this.getConfig();
    
    if (!config.environments[name]) {
      throw new Error(`Environment "${name}" not found`);
    }

    config.environments[name] = {
      ...config.environments[name],
      ...updates
    };

    this.saveConfig(config);
    return config.environments[name];
  }

  /**
   * 更新全局设置
   */
  updateSettings(settings: Partial<GlobalSettings>): GlobalSettings {
    const config = this.getConfig();
    config.settings = {
      ...config.settings,
      ...settings
    };
    this.saveConfig(config);
    return config.settings;
  }

  /**
   * 获取全局设置
   */
  getSettings(): GlobalSettings {
    return this.getConfig().settings;
  }

  /**
   * 检查环境是否存在
   */
  hasEnvironment(name: string): boolean {
    const config = this.getConfig();
    return !!config.environments[name];
  }

  /**
   * 获取环境数量
   */
  getEnvironmentCount(): number {
    const config = this.getConfig();
    return Object.keys(config.environments).length;
  }

  /**
   * 清除所有环境和重置配置
   */
  clearAll(): void {
    const config = this.getConfig();
    
    // 重置配置到初始状态
    config.current = null;
    config.environments = {};
    
    // 保存重置后的配置
    this.saveConfig(config);
  }
}