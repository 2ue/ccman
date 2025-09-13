#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ProviderManager } from './providers/ProviderManager';
import { AddProviderOptions } from './types';

const program = new Command();
const providerManager = new ProviderManager();

// 询问是否继续操作
async function askToContinue(): Promise<boolean> {
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'continue',
      message: 'Would you like to perform another operation?',
      default: true
    }
  ]);
  return answer.continue;
}

// 交互式配置菜单
async function showInteractiveMenu(): Promise<void> {
  // 设置 Ctrl+C 优雅退出处理
  process.removeAllListeners('SIGINT');
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\nOperation cancelled by user. Goodbye!'));
    process.exit(0);
  });

  try {
    let shouldContinue = true;

    while (shouldContinue) {
      await providerManager.init();
      const providers = await providerManager.listProviders();
      
      if (providers.length === 0) {
        console.log(chalk.yellow('No providers found. Let\'s create your first one.'));
        
        const answers = await inquirer.prompt([
          { 
            type: 'input', 
            name: 'id', 
            message: 'Provider ID (unique identifier):', 
            default: 'anthropic' 
          },
          { 
            type: 'input', 
            name: 'name', 
            message: 'Provider name:', 
            default: 'Anthropic Official' 
          },
          { 
            type: 'input', 
            name: 'description', 
            message: 'Description:', 
            default: 'Official Anthropic API' 
          },
          { 
            type: 'input', 
            name: 'baseUrl', 
            message: 'Base URL:', 
            default: 'https://api.anthropic.com' 
          },
          { 
            type: 'password', 
            name: 'apiKey', 
            message: 'API Key:', 
            mask: '*' 
          }
        ]);
        
        const result = await providerManager.addProvider({
          id: answers.id,
          name: answers.name,
          description: answers.description,
          baseUrl: answers.baseUrl,
          apiKey: answers.apiKey
        });
        
        if (result.success) {
          console.log(chalk.green(`✓ ${result.message}`));
          // 自动设为当前供应商
          const useResult = await providerManager.useProvider(answers.id);
          if (useResult.success) {
            console.log(chalk.green(`✓ ${useResult.message}`));
          }
        } else {
          console.error(chalk.red(`✗ ${result.message}`));
        }
        
        console.log();
        shouldContinue = await askToContinue();
        continue;
      }

      const choices = providers.map(provider => ({
        name: `${provider.name} (${provider.id}) - ${provider.baseUrl}${provider.isCurrent ? ' [current]' : ''}`,
        value: provider.id
      }));

      const action = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Switch provider', value: 'switch' },
            { name: 'Add new provider', value: 'add' },
            { name: 'Update provider', value: 'update' },
            { name: 'Remove provider', value: 'remove' },
            { name: 'Show detailed status', value: 'status' },
            { name: 'Exit', value: 'exit' }
          ]
        }
      ]);

      if (action.action === 'exit') {
        console.log(chalk.cyan('Thank you for using CCM. Goodbye!'));
        break;
      }

      switch (action.action) {
      case 'switch': {
        const switchAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'id',
            message: 'Select provider:',
            choices
          }
        ]);
        
        const switchResult = await providerManager.useProvider(switchAnswer.id);
        if (switchResult.success) {
          console.log(chalk.green(`✓ ${switchResult.message}`));
        } else {
          console.error(chalk.red(`✗ ${switchResult.message}`));
        }
        
        console.log();
        shouldContinue = await askToContinue();
        break;
      }

      case 'add': {
        const addAnswers = await inquirer.prompt([
          { type: 'input', name: 'id', message: 'Provider ID:' },
          { type: 'input', name: 'name', message: 'Provider name:' },
          { type: 'input', name: 'description', message: 'Description:' },
          { type: 'input', name: 'baseUrl', message: 'Base URL:' },
          { type: 'password', name: 'apiKey', message: 'API Key:', mask: '*' }
        ]);
        
        const addResult = await providerManager.addProvider(addAnswers);
        if (addResult.success) {
          console.log(chalk.green(`✓ ${addResult.message}`));
        } else {
          console.error(chalk.red(`✗ ${addResult.message}`));
        }
        
        console.log();
        shouldContinue = await askToContinue();
        break;
      }

      case 'update': {
        const updateIdAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'id',
            message: 'Select provider to update:',
            choices
          }
        ]);
        
        const currentProvider = providers.find(p => p.id === updateIdAnswer.id);
        if (currentProvider) {
          const updateAnswers = await inquirer.prompt([
            { type: 'input', name: 'name', message: 'Provider name:', default: currentProvider.name },
            { type: 'input', name: 'description', message: 'Description:', default: currentProvider.description },
            { type: 'input', name: 'baseUrl', message: 'Base URL:', default: currentProvider.baseUrl },
            { type: 'password', name: 'apiKey', message: 'API Key (leave empty to keep current):', mask: '*' }
          ]);
          
          const updateOptions: Partial<AddProviderOptions> = {
            name: updateAnswers.name,
            description: updateAnswers.description,
            baseUrl: updateAnswers.baseUrl
          };
          
          if (updateAnswers.apiKey.trim()) {
            updateOptions.apiKey = updateAnswers.apiKey;
          }
          
          const updateResult = await providerManager.updateProvider(updateIdAnswer.id, updateOptions);
          if (updateResult.success) {
            console.log(chalk.green(`✓ ${updateResult.message}`));
          } else {
            console.error(chalk.red(`✗ ${updateResult.message}`));
          }
        }
        
        console.log();
        shouldContinue = await askToContinue();
        break;
      }

      case 'remove': {
        const removeAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'id',
            message: 'Select provider to remove:',
            choices
          }
        ]);
        
        const confirmRemove = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to remove this provider?`,
            default: false
          }
        ]);
        
        if (confirmRemove.confirm) {
          const removeResult = await providerManager.removeProvider(removeAnswer.id);
          if (removeResult.success) {
            console.log(chalk.green(`✓ ${removeResult.message}`));
          } else {
            console.error(chalk.red(`✗ ${removeResult.message}`));
          }
        } else {
          console.log(chalk.yellow('Operation cancelled'));
        }
        
        console.log();
        shouldContinue = await askToContinue();
        break;
      }

      case 'status': {
        const stats = await providerManager.getStats();
        console.log();
        console.log(chalk.blue('CCM Status:'));
        console.log(`Total providers: ${stats.totalProviders}`);
        console.log(`Current provider: ${stats.currentProvider || 'None'}`);
        console.log(`Claude config: ${stats.claudeConfigPath}`);
        console.log(`CCM config: ${stats.ccmConfigPath}`);
        
        if (providers.length > 0) {
          console.log();
          console.log(chalk.blue('Recent providers:'));
          providers
            .filter(p => p.lastUsed)
            .slice(0, 3)
            .forEach(provider => {
              const marker = provider.isCurrent ? chalk.green('* ') : '  ';
              const name = provider.isCurrent ? chalk.green(provider.name) : provider.name;
              const lastUsed = new Date(provider.lastUsed!).toLocaleDateString();
              console.log(`${marker}${name} (${lastUsed}, ${provider.usageCount} uses)`);
            });
        }
        console.log();
        
        console.log();
        shouldContinue = await askToContinue();
        break;
      }
    }
    } // while 循环结束
  } catch (error) {
    console.error(chalk.red(`✗ Error: ${error}`));
    process.exit(1);
  } finally {
    // 恢复原始的 SIGINT 处理器
    process.removeAllListeners('SIGINT');
  }
}

program
  .name('ccman')
  .description('Claude Code Manager - Manage Claude API configurations')
  .version('2.0.0')
  .hook('preAction', () => {
    // 开发模式提示
    if (process.env.CCM_CONFIG_DIR || process.env.CLAUDE_CONFIG_PATH) {
      console.log(chalk.yellow('🔧 Development Mode:'));
      if (process.env.CCM_CONFIG_DIR) {
        console.log(chalk.yellow(`   CCM Config: ${process.env.CCM_CONFIG_DIR}`));
      }
      if (process.env.CLAUDE_CONFIG_PATH) {
        console.log(chalk.yellow(`   Claude Config: ${process.env.CLAUDE_CONFIG_PATH}`));
      }
      console.log();
    }
  })
  .action(async () => {
    // 默认无参数时进入交互菜单
    await showInteractiveMenu();
  });

// 智能列表命令
program
  .command('ls')
  .alias('list')
  .description('List provider configurations')
  .option('--current', 'Show only current provider details')
  .option('--brief', 'Show brief summary')
  .action(async (options?: { current?: boolean; brief?: boolean }) => {
    try {
      await providerManager.init();
      
      if (options?.current) {
        // 显示当前供应商详情
        const currentProvider = await providerManager.getCurrentProvider();
        
        if (!currentProvider) {
          console.log(chalk.yellow('No provider is currently active.'));
          console.log('Use "ccman use <id>" to activate a provider.');
          return;
        }

        console.log();
        console.log(chalk.green(`Current provider: ${currentProvider.config.name} (${currentProvider.id})`));
        console.log(`Description: ${currentProvider.config.description}`);
        console.log(`Base URL: ${currentProvider.config.config.env.ANTHROPIC_BASE_URL}`);
        console.log(`API Key: ${'*'.repeat(Math.min(currentProvider.config.config.env.ANTHROPIC_AUTH_TOKEN.length, 20))}`);
        console.log(`Usage count: ${currentProvider.config.metadata.usageCount} times`);
        console.log(`Last updated: ${new Date(currentProvider.config.metadata.updatedAt).toLocaleString()}`);
        console.log();
        return;
      }

      const providers = await providerManager.listProviders();
      
      if (providers.length === 0) {
        console.log(chalk.yellow('No provider configurations found. Use "ccman add" to create one.'));
        return;
      }

      if (options?.brief) {
        // 简洁模式
        console.log();
        providers.forEach(provider => {
          const marker = provider.isCurrent ? chalk.green('* ') : '  ';
          const name = provider.isCurrent ? chalk.green(provider.name) : provider.name;
          console.log(`${marker}${name} (${provider.id})`);
        });
        console.log();
        return;
      }

      // 默认详细模式（合并原 list + status 信息）
      const stats = await providerManager.getStats();
      
      console.log();
      console.log(chalk.blue('CCM Status:'));
      console.log(`Total providers: ${stats.totalProviders}`);
      console.log(`Current provider: ${stats.currentProvider || 'None'}`);
      console.log(`Claude config: ${stats.claudeConfigPath}`);
      console.log(`CCM config: ${stats.ccmConfigPath}`);
      console.log();
      
      console.log(chalk.blue('Providers:'));
      providers.forEach(provider => {
        const marker = provider.isCurrent ? chalk.green('* ') : '  ';
        const name = provider.isCurrent ? chalk.green(provider.name) : provider.name;
        console.log(`${marker}${name.padEnd(15)} ${provider.baseUrl}`);
        console.log(`${' '.repeat(17)} ${provider.description}`);
        
        if (provider.lastUsed) {
          const lastUsed = new Date(provider.lastUsed).toLocaleDateString();
          console.log(`${' '.repeat(17)} Last used: ${lastUsed}, Usage: ${provider.usageCount} times`);
        }
        console.log();
      });

    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// 添加供应商
program
  .command('add <id> <name> <baseUrl> [apiKey]')
  .description('Add a new provider configuration')
  .option('-d, --description <desc>', 'Provider description')
  .action(async (id: string, name: string, baseUrl: string, apiKey?: string, options?: { description?: string }) => {
    try {
      await providerManager.init();
      
      if (!apiKey) {
        const answer = await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: 'Enter API Key:',
            mask: '*'
          }
        ]);
        apiKey = answer.apiKey;
      }

      const addOptions: AddProviderOptions = {
        id,
        name,
        description: options?.description,
        baseUrl,
        apiKey: apiKey!
      };

      const result = await providerManager.addProvider(addOptions);
      
      if (result.success) {
        console.log(chalk.green(`✓ ${result.message}`));
        
        // 询问是否设为当前供应商
        const currentProvider = await providerManager.getCurrentProvider();
        if (!currentProvider || currentProvider.id !== id) {
          const useAnswer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'useCurrent',
              message: `Set "${name}" as current provider?`,
              default: true
            }
          ]);
          
          if (useAnswer.useCurrent) {
            const useResult = await providerManager.useProvider(id);
            if (useResult.success) {
              console.log(chalk.green(`✓ ${useResult.message}`));
            } else {
              console.error(chalk.red(`✗ ${useResult.message}`));
            }
          }
        }
      } else {
        console.error(chalk.red(`✗ ${result.message}`));
        process.exit(1);
      }
      
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// 使用供应商
program
  .command('use <id>')
  .description('Switch to a provider configuration')
  .action(async (id: string) => {
    try {
      await providerManager.init();
      const result = await providerManager.useProvider(id);
      
      if (result.success) {
        console.log(chalk.green(`✓ ${result.message}`));
        console.log(chalk.cyan('Claude Code configuration has been updated successfully!'));
      } else {
        console.error(chalk.red(`✗ ${result.message}`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// 删除供应商
program
  .command('rm <id>')
  .alias('remove')
  .description('Remove a provider configuration')
  .action(async (id: string) => {
    try {
      await providerManager.init();
      const providers = await providerManager.listProviders();
      const provider = providers.find(p => p.id === id);
      
      if (!provider) {
        console.error(chalk.red(`✗ Provider '${id}' not found`));
        process.exit(1);
      }

      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to remove provider "${provider.name}" (${id})?`,
          default: false
        }
      ]);

      if (answer.confirm) {
        const result = await providerManager.removeProvider(id);
        
        if (result.success) {
          console.log(chalk.green(`✓ ${result.message}`));
        } else {
          console.error(chalk.red(`✗ ${result.message}`));
        }
      } else {
        console.log(chalk.yellow('Operation cancelled'));
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// 清除所有配置
program
  .command('clear')
  .alias('reset')
  .description('Clear all provider configurations (DESTRUCTIVE)')
  .action(async () => {
    try {
      const confirmAnswer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: chalk.red('⚠️  This will remove ALL provider configurations. Are you sure?'),
          default: false
        }
      ]);

      if (!confirmAnswer.confirmed) {
        console.log(chalk.yellow('Operation cancelled.'));
        return;
      }

      await providerManager.init();
      const result = await providerManager.clearAll();

      if (result.success) {
        console.log(chalk.green(`✓ ${result.message}`));
        console.log(chalk.cyan('CCM has been reset to initial state.'));
        console.log(chalk.cyan('You can start fresh with: ccman'));
      } else {
        console.error(chalk.red(`✗ ${result.message}`));
      }

    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// 解析命令行参数
program.parse(process.argv);