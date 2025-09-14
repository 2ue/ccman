import * as fs from 'fs-extra';
import * as path from 'path';
import { ClaudeSettings } from '../types';
import { envConfig } from '../utils/env-config';

/**
 * Claude配置管理器
 * 负责直接修改 ~/.claude/settings.json
 */
export class ClaudeConfigManager {
  private claudeConfigPath: string;

  constructor(claudeConfigPath?: string) {
    // 优先使用传入参数，否则使用编译时确定的路径
    this.claudeConfigPath = claudeConfigPath || envConfig.getClaudeConfigPath();
  }

  /**
   * 读取Claude配置
   */
  async readClaudeConfig(): Promise<ClaudeSettings | null> {
    try {
      if (!await fs.pathExists(this.claudeConfigPath)) {
        return null;
      }
      
      const content = await fs.readFile(this.claudeConfigPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read Claude config: ${error}`);
    }
  }

  /**
   * 选择性写入Claude配置
   * 只覆盖指定的key，保留其他用户配置
   */
  async writeClaudeConfig(config: ClaudeSettings): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.claudeConfigPath));
      
      let existingConfig: any = {};
      
      // 如果文件已存在，先读取现有配置
      if (await fs.pathExists(this.claudeConfigPath)) {
        const content = await fs.readFile(this.claudeConfigPath, 'utf8');
        existingConfig = JSON.parse(content);
      }
      
      // 选择性覆盖只有CCM管理的key
      const mergedConfig = {
        ...existingConfig, // 保留现有配置
        env: {
          ...existingConfig.env, // 保留现有env配置
          // 只覆盖CCM管理的环境变量
          ANTHROPIC_AUTH_TOKEN: config.env.ANTHROPIC_AUTH_TOKEN,
          ANTHROPIC_BASE_URL: config.env.ANTHROPIC_BASE_URL,
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: config.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC
        },
        permissions: {
          ...existingConfig.permissions, // 保留现有permissions配置
          // 覆盖CCM管理的权限设置
          allow: config.permissions.allow,
          deny: config.permissions.deny
        }
      };
      
      await fs.writeFile(this.claudeConfigPath, JSON.stringify(mergedConfig, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to write Claude config: ${error}`);
    }
  }

  /**
   * 备份当前Claude配置
   */
  async backupClaudeConfig(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${this.claudeConfigPath}.backup-${timestamp}`;
      
      if (await fs.pathExists(this.claudeConfigPath)) {
        await fs.copy(this.claudeConfigPath, backupPath);
        return backupPath;
      }
      
      return '';
    } catch (error) {
      throw new Error(`Failed to backup Claude config: ${error}`);
    }
  }

  /**
   * 恢复Claude配置
   */
  async restoreClaudeConfig(backupPath: string): Promise<void> {
    try {
      if (await fs.pathExists(backupPath)) {
        await fs.copy(backupPath, this.claudeConfigPath);
      }
    } catch (error) {
      throw new Error(`Failed to restore Claude config: ${error}`);
    }
  }

  /**
   * 验证Claude配置目录是否存在
   */
  async ensureClaudeConfigDir(): Promise<void> {
    const claudeDir = path.dirname(this.claudeConfigPath);
    
    if (!await fs.pathExists(claudeDir)) {
      throw new Error(`Claude config directory not found: ${claudeDir}. Please ensure Claude Code is installed and initialized.`);
    }
  }

  /**
   * 获取Claude配置路径
   */
  getClaudeConfigPath(): string {
    return this.claudeConfigPath;
  }
}