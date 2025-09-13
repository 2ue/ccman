import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { LanguageManager } from '../i18n/LanguageManager';

export function createLanguageCommands(): Command {
  const langCommand = new Command('lang');
  const languageManager = new LanguageManager();

  langCommand
    .description('Manage language settings / 管理语言设置');

  // ccman lang - 显示当前语言设置
  langCommand
    .action(async () => {
      try {
        const stats = await languageManager.getLanguageStats();
        const messages = await languageManager.getMessages();
        
        console.log();
        console.log(chalk.blue(`${messages.language.current} ${getLanguageDisplayName(stats.current)}`));
        
        if (stats.current === 'auto') {
          console.log(chalk.gray(`Auto-detected: ${getLanguageDisplayName(stats.autoDetected!)}`));
        }
        
        console.log(chalk.cyan(messages.language.availableCommands));
        console.log();
        
      } catch (error) {
        console.error(chalk.red(`✗ Error: ${error}`));
        process.exit(1);
      }
    });

  // ccman lang set <language> - 设置语言
  langCommand
    .command('set <language>')
    .description('Set language preference / 设置语言偏好')
    .action(async (language: string) => {
      try {
        if (!['zh', 'en', 'auto'].includes(language)) {
          const messages = await languageManager.getMessages();
          console.error(chalk.red(`✗ ${messages.language.invalidLanguage}`));
          process.exit(1);
        }

        await languageManager.setLanguage(language as 'zh' | 'en' | 'auto');
        
        // 重新获取消息（可能语言已变更）
        const messages = await languageManager.getMessages();
        console.log(chalk.green(`✓ ${messages.language.switchSuccess}`));
        console.log(chalk.cyan(`${messages.language.current} ${getLanguageDisplayName(language)}`));
        
      } catch (error) {
        console.error(chalk.red(`✗ Error: ${error}`));
        process.exit(1);
      }
    });

  // ccman lang reset - 重置语言设置
  langCommand
    .command('reset')
    .description('Reset language setting to first-run state / 重置语言设置为首次运行状态')
    .action(async () => {
      try {
        const messages = await languageManager.getMessages();
        
        const answer = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: messages.language.resetConfirm,
            default: false
          }
        ]);

        if (answer.confirm) {
          await languageManager.resetLanguage();
          console.log(chalk.green(`✓ ${messages.language.resetSuccess}`));
        } else {
          console.log(chalk.yellow(messages.cancelled));
        }
        
      } catch (error) {
        console.error(chalk.red(`✗ Error: ${error}`));
        process.exit(1);
      }
    });

  return langCommand;
}

function getLanguageDisplayName(lang: string): string {
  switch (lang) {
    case 'zh':
      return '中文 (Chinese)';
    case 'en':
      return 'English';
    case 'auto':
      return 'Auto-detect / 自动检测';
    default:
      return lang;
  }
}