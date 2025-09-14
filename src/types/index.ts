/**
 * Claude Code Manager 类型定义
 * 新架构：直接修改 ~/.claude/settings.json
 */

/**
 * Claude settings.json 结构
 */
export interface ClaudeSettings {
  env: {
    ANTHROPIC_AUTH_TOKEN: string;
    ANTHROPIC_BASE_URL: string;
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC?: number;
  };
  permissions: {
    allow: string[];
    deny: string[];
  };
}

/**
 * 供应商配置
 */
export interface ProviderConfig {
  name: string;
  description: string;
  config: ClaudeSettings;
  metadata: {
    createdAt: string;
    updatedAt: string;
    usageCount: number;
  };
}

/**
 * CCM 主配置
 */
export interface CCMConfig {
  version: string;
  currentProvider: string;
  claudeConfigPath: string;
  providers: {
    [providerId: string]: {
      name: string;
      configFile: string;
      lastUsed: string;
    };
  };
  settings: {
    language: 'zh' | 'en' | 'auto' | null;
    firstRun: boolean;
  };
  metadata: {
    version: string;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * 添加供应商选项
 */
export interface AddProviderOptions {
  name: string;
  description?: string;
  baseUrl: string;
  apiKey: string;
}

/**
 * 供应商列表项
 */
export interface ProviderListItem {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  isCurrent: boolean;
  lastUsed?: string;
  usageCount: number;
}

/**
 * 操作结果
 */
export interface OperationResult {
  success: boolean;
  message: string;
  error?: string;
  data?: any;
}

/**
 * 语言配置统计
 */
export interface LanguageStats {
  current: 'zh' | 'en' | 'auto';
  isFirstRun: boolean;
  autoDetected?: string;
}