import inquirer from 'inquirer';
import { MessageBundle, chineseMessages, englishMessages } from './messages';
import { CCMConfigManager } from '../core/CCMConfigManager';
import { LanguageStats } from '../types';

export class LanguageManager {
  private configManager: CCMConfigManager;
  
  constructor() {
    this.configManager = new CCMConfigManager();
  }

  /**
   * 检测系统是否为英文环境
   */
  private shouldUseEnglish(): boolean {
    const locale = process.env.LANG || process.env.LANGUAGE || '';
    return locale.toLowerCase().startsWith('en');
  }

  /**
   * 检查是否为首次运行
   */
  async isFirstRun(): Promise<boolean> {
    try {
      await this.configManager.init();
      const config = await this.configManager.readConfig();
      return !config.settings || config.settings.language === null || config.settings.firstRun !== false;
    } catch (error) {
      // 配置不存在，视为首次运行
      return true;
    }
  }

  /**
   * 获取当前语言设置
   */
  async getCurrentLanguage(): Promise<'zh' | 'en'> {
    try {
      await this.configManager.init();
      const config = await this.configManager.readConfig();
      const langSetting = config.settings?.language;

      switch (langSetting) {
        case 'zh':
          return 'zh';
        case 'en':
          return 'en';
        case 'auto':
          return this.shouldUseEnglish() ? 'en' : 'zh';
        default:
          // 首次运行或未设置，根据系统环境决定
          return this.shouldUseEnglish() ? 'en' : 'zh';
      }
    } catch (error) {
      // 配置读取失败，使用自动检测
      return this.shouldUseEnglish() ? 'en' : 'zh';
    }
  }

  /**
   * 获取当前语言的消息包
   */
  async getMessages(): Promise<MessageBundle> {
    const currentLang = await this.getCurrentLanguage();
    return currentLang === 'en' ? englishMessages : chineseMessages;
  }

  /**
   * 首次运行语言选择向导
   */
  async promptLanguageChoice(): Promise<'zh' | 'en' | 'auto'> {
    console.log('🌍 Welcome to CCM! / 欢迎使用 CCM!\n');
    console.log('This is your first time running CCM.');
    console.log('这是您首次运行 CCM。\n');

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'language',
        message: 'Please choose your preferred language:\n请选择您偏好的语言：',
        choices: [
          {
            name: '🇨🇳 中文 (Chinese)',
            value: 'zh'
          },
          {
            name: '🇺🇸 English',
            value: 'en'
          },
          {
            name: '🌐 自动检测 (Auto-detect based on system)',
            value: 'auto'
          }
        ]
      }
    ]);

    return answer.language;
  }

  /**
   * 设置语言
   */
  async setLanguage(language: 'zh' | 'en' | 'auto'): Promise<void> {
    await this.configManager.init();
    const config = await this.configManager.readConfig();
    
    // 更新配置
    const updatedConfig = {
      ...config,
      settings: {
        ...config.settings,
        language,
        firstRun: false
      }
    };

    await this.configManager.writeConfig(updatedConfig);
  }

  /**
   * 重置语言设置（恢复首次运行状态）
   */
  async resetLanguage(): Promise<void> {
    await this.configManager.init();
    const config = await this.configManager.readConfig();
    
    const updatedConfig = {
      ...config,
      settings: {
        ...config.settings,
        language: null,
        firstRun: true
      }
    };

    await this.configManager.writeConfig(updatedConfig);
  }

  /**
   * 获取语言统计信息
   */
  async getLanguageStats(): Promise<LanguageStats> {
    await this.configManager.init();
    const config = await this.configManager.readConfig();
    
    return {
      current: config.settings?.language || 'auto',
      isFirstRun: await this.isFirstRun(),
      autoDetected: this.shouldUseEnglish() ? 'en' : 'zh'
    };
  }

  /**
   * 处理首次运行流程
   */
  async handleFirstRun(): Promise<void> {
    if (await this.isFirstRun()) {
      const selectedLang = await this.promptLanguageChoice();
      await this.setLanguage(selectedLang);
      
      // 显示设置成功消息（双语）
      const messages = await this.getMessages();
      console.log(`\n✓ ${messages.languageSetSuccess}`);
      console.log(`✓ ${messages.languageChangeHint}\n`);
    }
  }
}