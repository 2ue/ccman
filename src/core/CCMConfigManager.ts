import * as fs from 'fs-extra';
import * as path from 'path';
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
    // 使用编译时生成的静态配置
    this.configDir = envConfig.getCCMConfigDir();
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
      // 使用编译时确定的Claude配置路径
      const defaultConfig: CCMConfig = {
        version: getPackageVersion(),
        currentProvider: '',
        claudeConfigPath: envConfig.getClaudeConfigPath(),
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
      
      // 迁移旧版本配置
      const migratedConfig = await this.migrateConfig(config);
      
      // 如果配置被迁移了，立即保存新格式
      if (this.needsMigration(config)) {
        await fs.writeFile(this.configPath, JSON.stringify(migratedConfig, null, 2));
      }
      
      return migratedConfig;
    } catch (error) {
      throw new Error(`Failed to read CCM config: ${error}`);
    }
  }

  /**
   * 写入主配置
   */
  async writeConfig(config: CCMConfig): Promise<void> {
    try {
      // 确保配置结构完整，兼容旧版本
      const migratedConfig = await this.migrateConfig(config);
      
      // 更新版本信息和时间戳
      migratedConfig.version = getPackageVersion();
      migratedConfig.metadata.version = getPackageVersion();
      migratedConfig.metadata.updatedAt = new Date().toISOString();
      
      await fs.writeFile(this.configPath, JSON.stringify(migratedConfig, null, 2));
    } catch (error) {
      throw new Error(`Failed to write CCM config: ${error}`);
    }
  }

  /**
   * 检查是否需要迁移配置
   */
  private needsMigration(config: any): boolean {
    // 只检查metadata字段，因为version字段是新添加的
    return !config.metadata;
  }

  /**
   * 执行配置迁移
   */
  private async performMigration(config: any): Promise<CCMConfig> {
    console.log('🔄 Migrating configuration from older version...');
    
    // 备份旧配置
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.configPath}.backup-v1-${timestamp}`;
    
    if (await fs.pathExists(this.configPath)) {
      await fs.copy(this.configPath, backupPath);
      console.log(`📦 Old config backed up to: ${backupPath}`);
    }
    
    // 迁移到新格式
    const migratedConfig: CCMConfig = {
      version: getPackageVersion(),
      currentProvider: config.currentProvider || '',
      claudeConfigPath: config.claudeConfigPath || envConfig.getClaudeConfigPath(),
      providers: config.providers || {},
      settings: {
        language: config.settings?.language || null,
        firstRun: config.settings?.firstRun ?? true
      },
      metadata: {
        version: getPackageVersion(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    
    console.log('✅ Configuration migration completed');
    return migratedConfig;
  }

  /**
   * 配置迁移和兼容性处理
   */
  private async migrateConfig(config: any): Promise<CCMConfig> {
    // 检查是否需要迁移
    if (this.needsMigration(config)) {
      return await this.performMigration(config);
    }
    
    // 确保所有必需字段存在
    return {
      version: config.version || getPackageVersion(),
      currentProvider: config.currentProvider || '',
      claudeConfigPath: config.claudeConfigPath || envConfig.getClaudeConfigPath(),
      providers: config.providers || {},
      settings: {
        language: config.settings?.language || null,
        firstRun: config.settings?.firstRun ?? true
      },
      metadata: {
        version: config.metadata?.version || getPackageVersion(),
        createdAt: config.metadata?.createdAt || new Date().toISOString(),
        updatedAt: config.metadata?.updatedAt || new Date().toISOString()
      }
    };
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