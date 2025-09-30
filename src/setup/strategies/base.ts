/**
 * 安装策略基础类
 */
import { InstallOption, InstallStep, Platform } from '../types';
import { commandExists } from '../../utils/command';

/**
 * 安装策略基类
 */
export abstract class InstallStrategy {
  protected platform: Platform;

  constructor() {
    this.platform = process.platform as Platform;
  }

  /**
   * 获取安装选项
   */
  abstract getOptions(): Promise<InstallOption[]>;

  /**
   * 检查平台工具是否存在
   */
  protected async checkPlatformTools(): Promise<{
    brew?: boolean;
    apt?: boolean;
    yum?: boolean;
    choco?: boolean;
    scoop?: boolean;
  }> {
    const tools: any = {};

    if (this.platform === 'darwin') {
      tools.brew = await commandExists('brew');
    } else if (this.platform === 'linux') {
      tools.apt = await commandExists('apt');
      tools.yum = await commandExists('yum');
    } else if (this.platform === 'win32') {
      tools.choco = await commandExists('choco');
      tools.scoop = await commandExists('scoop');
    }

    return tools;
  }
}