import { CCMConfigManager } from '../core/CCMConfigManager';
import { ClaudeConfigManager } from '../core/ClaudeConfigManager';
import { envConfig } from '../utils/env-config';
import { 
  AddProviderOptions, 
  ProviderListItem, 
  ProviderConfig, 
  OperationResult 
} from '../types';

/**
 * 供应商管理器
 * 核心业务逻辑：管理多个供应商配置并切换Claude配置
 */
export class ProviderManager {
  private ccmConfig: CCMConfigManager;
  private claudeConfig: ClaudeConfigManager;

  constructor() {
    this.ccmConfig = new CCMConfigManager();
    // ClaudeConfigManager 将在 init() 中根据 CCM 配置初始化
    this.claudeConfig = new ClaudeConfigManager();
  }

  /**
   * 初始化
   */
  async init(): Promise<void> {
    await this.ccmConfig.init();
    
    // 获取 CCM 配置中的 Claude 配置路径
    const config = await this.ccmConfig.readConfig();
    this.claudeConfig = new ClaudeConfigManager(config.claudeConfigPath);
    
    await this.claudeConfig.ensureClaudeConfigDir();
  }

  /**
   * 生成供应商唯一ID
   * 基于名称生成，确保唯一性
   */
  private async generateProviderId(name: string): Promise<string> {
    // 基础ID：转换为小写，替换空格和特殊字符
    const baseId = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')  // 替换非字母数字字符为连字符
      .replace(/-+/g, '-')         // 合并多个连字符
      .replace(/^-|-$/g, '');      // 移除首尾连字符
    
    // 检查ID是否已存在
    const config = await this.ccmConfig.readConfig();
    let finalId = baseId;
    let counter = 1;
    
    while (config.providers[finalId]) {
      finalId = `${baseId}-${counter}`;
      counter++;
    }
    
    return finalId;
  }

  /**
   * 添加新的供应商配置
   */
  async addProvider(options: AddProviderOptions): Promise<OperationResult> {
    try {
      // 自动生成唯一ID
      const providerId = await this.generateProviderId(options.name);
      
      // 设置默认描述为供应商名称
      const description = options.description || options.name;

      // 创建供应商配置
      const providerConfig: ProviderConfig = {
        name: options.name,
        description: description,
        config: {
          env: {
            ANTHROPIC_AUTH_TOKEN: options.apiKey,
            ANTHROPIC_BASE_URL: options.baseUrl,
            CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
            CLAUDE_CODE_MAX_OUTPUT_TOKENS: 32000
          },
          permissions: {
            allow: [],
            deny: []
          }
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          usageCount: 0
        }
      };

      // 保存供应商配置
      await this.ccmConfig.writeProviderConfig(providerId, providerConfig);

      // 更新主配置
      const config = await this.ccmConfig.readConfig();
      config.providers[providerId] = {
        name: options.name,
        configFile: `${providerId}.json`,
        lastUsed: new Date().toISOString()
      };

      // 如果这是第一个供应商，设为当前并更新Claude配置
      if (Object.keys(config.providers).length === 1) {
        config.currentProvider = providerId;
        
        // 更新Claude配置，首次可能需要备份
        await this.claudeConfig.writeClaudeConfig(providerConfig.config);
        
        // 增加使用次数
        providerConfig.metadata.usageCount++;
        await this.ccmConfig.writeProviderConfig(providerId, providerConfig);
      }

      await this.ccmConfig.writeConfig(config);

      return {
        success: true,
        message: `Successfully added provider '${options.name}' (ID: ${providerId})`,
        data: { providerId }  // 返回生成的ID
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to add provider: ${error}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 删除供应商配置
   */
  async removeProvider(providerId: string): Promise<OperationResult> {
    try {
      const config = await this.ccmConfig.readConfig();
      
      if (!config.providers[providerId]) {
        return {
          success: false,
          message: `Provider '${providerId}' not found`
        };
      }

      // 删除供应商配置文件
      await this.ccmConfig.deleteProviderConfig(providerId);

      // 从主配置中移除
      delete config.providers[providerId];

      // 如果删除的是当前供应商，重置当前供应商
      if (config.currentProvider === providerId) {
        const remainingProviders = Object.keys(config.providers);
        config.currentProvider = remainingProviders.length > 0 ? remainingProviders[0] : '';
      }

      await this.ccmConfig.writeConfig(config);

      return {
        success: true,
        message: `Successfully removed provider '${providerId}'`
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to remove provider: ${error}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 切换到指定供应商
   */
  async useProvider(providerId: string): Promise<OperationResult> {
    try {
      const config = await this.ccmConfig.readConfig();
      
      if (!config.providers[providerId]) {
        return {
          success: false,
          message: `Provider '${providerId}' not found`
        };
      }

      // 读取供应商配置
      const providerConfig = await this.ccmConfig.readProviderConfig(providerId);
      if (!providerConfig) {
        return {
          success: false,
          message: `Provider config file for '${providerId}' not found`
        };
      }

      // 更新Claude配置（不需要备份，因为都是CCM管理的配置之间切换）
      await this.claudeConfig.writeClaudeConfig(providerConfig.config, true);

      // 更新CCM配置
      config.currentProvider = providerId;
      config.providers[providerId].lastUsed = new Date().toISOString();
      await this.ccmConfig.writeConfig(config);

      // 增加使用次数
      providerConfig.metadata.usageCount++;
      await this.ccmConfig.writeProviderConfig(providerId, providerConfig);

      return {
        success: true,
        message: `Successfully switched to provider '${config.providers[providerId].name}'`
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to switch provider: ${error}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 获取当前供应商
   */
  async getCurrentProvider(): Promise<{ id: string; config: ProviderConfig } | null> {
    try {
      const config = await this.ccmConfig.readConfig();
      
      if (!config.currentProvider) {
        return null;
      }

      const providerConfig = await this.ccmConfig.readProviderConfig(config.currentProvider);
      if (!providerConfig) {
        return null;
      }

      return {
        id: config.currentProvider,
        config: providerConfig
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * 列出所有供应商
   */
  async listProviders(): Promise<ProviderListItem[]> {
    try {
      const config = await this.ccmConfig.readConfig();
      const providers: ProviderListItem[] = [];

      for (const [providerId, providerInfo] of Object.entries(config.providers)) {
        const providerConfig = await this.ccmConfig.readProviderConfig(providerId);
        
        if (providerConfig) {
          const info = providerInfo as { name: string; configFile: string; lastUsed: string };
          providers.push({
            id: providerId,
            name: providerConfig.name,
            description: providerConfig.description,
            baseUrl: providerConfig.config.env.ANTHROPIC_BASE_URL,
            isCurrent: config.currentProvider === providerId,
            lastUsed: info.lastUsed,
            usageCount: providerConfig.metadata.usageCount
          });
        }
      }

      return providers.sort((a, b) => {
        // 先按是否为当前排序，再按最后使用时间排序
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        
        const aTime = new Date(a.lastUsed || '').getTime();
        const bTime = new Date(b.lastUsed || '').getTime();
        return bTime - aTime;
      });

    } catch (error) {
      return [];
    }
  }

  /**
   * 更新供应商配置
   */
  async updateProvider(providerId: string, updates: Partial<AddProviderOptions>): Promise<OperationResult> {
    try {
      const providerConfig = await this.ccmConfig.readProviderConfig(providerId);
      if (!providerConfig) {
        return {
          success: false,
          message: `Provider '${providerId}' not found`
        };
      }

      // 更新配置
      if (updates.name) {
        providerConfig.name = updates.name;
      }
      if (updates.description) {
        providerConfig.description = updates.description;
      }
      if (updates.baseUrl) {
        providerConfig.config.env.ANTHROPIC_BASE_URL = updates.baseUrl;
      }
      if (updates.apiKey) {
        providerConfig.config.env.ANTHROPIC_AUTH_TOKEN = updates.apiKey;
      }

      await this.ccmConfig.writeProviderConfig(providerId, providerConfig);

      // 如果更新的是当前供应商，同步更新Claude配置
      const config = await this.ccmConfig.readConfig();
      if (config.currentProvider === providerId) {
        await this.claudeConfig.writeClaudeConfig(providerConfig.config, true);
      }

      // 更新主配置中的名称
      if (updates.name) {
        config.providers[providerId].name = updates.name;
        await this.ccmConfig.writeConfig(config);
      }

      return {
        success: true,
        message: `Successfully updated provider '${providerId}'`
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to update provider: ${error}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 清除所有配置
   */
  async clearAll(): Promise<OperationResult> {
    try {
      await this.ccmConfig.clearAll();
      
      return {
        success: true,
        message: 'Successfully cleared all CCM configurations'
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to clear configurations: ${error}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    totalProviders: number;
    currentProvider: string | null;
    claudeConfigPath: string;
    ccmConfigPath: string;
    ccmConfigFile: string;
    providersDir: string;
    environment: string;
  }> {
    try {
      const config = await this.ccmConfig.readConfig();
      const currentProvider = config.currentProvider ? 
        (config.providers[config.currentProvider]?.name || config.currentProvider) : null;

      // 从静态配置获取环境信息
      const environment = envConfig.getCurrentEnvironment();

      return {
        totalProviders: Object.keys(config.providers).length,
        currentProvider,
        claudeConfigPath: this.claudeConfig.getClaudeConfigPath(),
        ccmConfigPath: this.ccmConfig.getConfigDir(),
        ccmConfigFile: `${this.ccmConfig.getConfigDir()}/config.json`,
        providersDir: this.ccmConfig.getProvidersDir(),
        environment
      };

    } catch (error) {
      return {
        totalProviders: 0,
        currentProvider: null,
        claudeConfigPath: this.claudeConfig.getClaudeConfigPath(),
        ccmConfigPath: this.ccmConfig.getConfigDir(),
        ccmConfigFile: `${this.ccmConfig.getConfigDir()}/config.json`,
        providersDir: this.ccmConfig.getProvidersDir(),
        environment: 'unknown'
      };
    }
  }
}