import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { CCMConfig, ProviderConfig } from '../types';
import { getPackageVersion } from '../utils/version';
import { envConfig } from '../utils/env-config';

/**
 * CCM配置管理器
 * 负责管理 ~/.ccman/ 目录下的配置文件
 */
export class CCMConfigManager {
  private configDir: string;
  private configPath: string;
  private providersDir: string;

  constructor() {
    // 加载环境配置
    envConfig.load();
    
    // 从环境变量读取配置目录，支持~扩展
    const configDirName = process.env.CCM_CONFIG_DIR;
    if (!configDirName) {
      throw new Error('CCM_CONFIG_DIR environment variable is required');
    }
    
    // 处理~路径扩展
    this.configDir = configDirName.startsWith('~') 
      ? path.join(os.homedir(), configDirName.slice(2))
      : configDirName;
      
    this.configPath = path.join(this.configDir, 'config.json');
    this.providersDir = path.join(this.configDir, 'providers');
  }

  /**
   * 初始化配置目录和文件
   */
  async init(): Promise<void> {
    await fs.ensureDir(this.configDir);
    await fs.ensureDir(this.providersDir);
    
    if (!await fs.pathExists(this.configPath)) {
      // 从环境变量读取Claude配置路径
      const claudeConfigPath = process.env.CLAUDE_CONFIG_PATH;
      if (!claudeConfigPath) {
        throw new Error('CLAUDE_CONFIG_PATH environment variable is required');
      }
      
      // 处理~路径扩展
      const expandedClaudeConfigPath = claudeConfigPath.startsWith('~')
        ? path.join(os.homedir(), claudeConfigPath.slice(2))
        : claudeConfigPath;
      
      const defaultConfig: CCMConfig = {
        currentProvider: '',
        claudeConfigPath: expandedClaudeConfigPath,
        providers: {},
        settings: {
          language: null,
          firstRun: true
        },
        metadata: {
          version: getPackageVersion(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
      
      await fs.writeFile(this.configPath, JSON.stringify(defaultConfig, null, 2));
    }
  }

  /**
   * 读取主配置
   */
  async readConfig(): Promise<CCMConfig> {
    try {
      if (!await fs.pathExists(this.configPath)) {
        await this.init();
      }
      
      const content = await fs.readFile(this.configPath, 'utf8');
      const config = JSON.parse(content);
      
      // 确保providers字段存在
      if (!config.providers) {
        config.providers = {};
      }

      // 确保settings字段存在（兼容旧版本）
      if (!config.settings) {
        config.settings = {
          language: null,
          firstRun: true
        };
      }
      
      return config;
    } catch (error) {
      throw new Error(`Failed to read CCM config: ${error}`);
    }
  }

  /**
   * 写入主配置
   */
  async writeConfig(config: CCMConfig): Promise<void> {
    try {
      config.metadata.updatedAt = new Date().toISOString();
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to write CCM config: ${error}`);
    }
  }

  /**
   * 读取供应商配置
   */
  async readProviderConfig(providerId: string): Promise<ProviderConfig | null> {
    try {
      const providerPath = path.join(this.providersDir, `${providerId}.json`);
      
      if (!await fs.pathExists(providerPath)) {
        return null;
      }
      
      const content = await fs.readFile(providerPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read provider config: ${error}`);
    }
  }

  /**
   * 写入供应商配置
   */
  async writeProviderConfig(providerId: string, config: ProviderConfig): Promise<void> {
    try {
      const providerPath = path.join(this.providersDir, `${providerId}.json`);
      config.metadata.updatedAt = new Date().toISOString();
      
      await fs.writeFile(providerPath, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to write provider config: ${error}`);
    }
  }

  /**
   * 删除供应商配置
   */
  async deleteProviderConfig(providerId: string): Promise<void> {
    try {
      const providerPath = path.join(this.providersDir, `${providerId}.json`);
      
      if (await fs.pathExists(providerPath)) {
        await fs.remove(providerPath);
      }
    } catch (error) {
      throw new Error(`Failed to delete provider config: ${error}`);
    }
  }

  /**
   * 列出所有供应商配置文件
   */
  async listProviderFiles(): Promise<string[]> {
    try {
      if (!await fs.pathExists(this.providersDir)) {
        return [];
      }
      
      const files = await fs.readdir(this.providersDir);
      return files
        .filter((file: string) => file.endsWith('.json'))
        .map((file: string) => file.replace('.json', ''));
    } catch (error) {
      throw new Error(`Failed to list provider files: ${error}`);
    }
  }

  /**
   * 清除所有配置
   */
  async clearAll(): Promise<void> {
    try {
      if (await fs.pathExists(this.configDir)) {
        await fs.remove(this.configDir);
      }
    } catch (error) {
      throw new Error(`Failed to clear all configs: ${error}`);
    }
  }

  /**
   * 获取配置目录路径
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * 获取供应商配置目录路径
   */
  getProvidersDir(): string {
    return this.providersDir;
  }
}