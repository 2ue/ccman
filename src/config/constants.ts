/**
 * CCMan (Claude Code Manager) 配置常量
 * 简化版本 - 只保留实际需要的常量
 */

import * as path from 'path';
import * as os from 'os';

/**
 * 应用配置常量
 */
export const CONFIG = {
  /**
   * 路径配置
   */
  PATHS: {
    DIR: '.ccman',
    CONFIG_FILE: 'config.json',
    SHELL_RC: '.ccmanrc'
  },
  
  /**
   * 环境变量名称
   */
  ENV_VARS: {
    BASE_URL: 'ANTHROPIC_BASE_URL',
    AUTH_TOKEN: 'ANTHROPIC_AUTH_TOKEN'
  },
  
  /**
   * 应用元信息
   */
  APP_NAME: 'CCMan',
  APP_FULL_NAME: 'Claude Code Manager'
} as const;

/**
 * 获取完整路径的辅助函数
 */
export function getConfigDir(): string {
  return path.join(os.homedir(), CONFIG.PATHS.DIR);
}

export function getConfigFile(): string {
  return path.join(getConfigDir(), CONFIG.PATHS.CONFIG_FILE);
}

export function getShellRCFile(): string {
  return path.join(getConfigDir(), CONFIG.PATHS.SHELL_RC);
}

/**
 * 获取显示用的路径字符串
 */
export function getDisplayPath(type: 'config' | 'shellrc'): string {
  switch (type) {
    case 'config':
      return `~/${CONFIG.PATHS.DIR}/${CONFIG.PATHS.CONFIG_FILE}`;
    case 'shellrc':
      return `~/${CONFIG.PATHS.DIR}/${CONFIG.PATHS.SHELL_RC}`;
    default:
      return `~/${CONFIG.PATHS.DIR}`;
  }
}