#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EnvironmentManager } from './config/EnvironmentManager';
import { AddEnvOptions } from './types';

// 动态读取版本号
const getPackageVersion = (): string => {
  try {
    const packageJsonPath = join(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.warn(chalk.yellow('⚠️  无法读取版本信息，使用默认版本'));
    return '0.0.1';
  }
};

const program = new Command();
const envManager = new EnvironmentManager();

/**
 * 统一的 use 环境交互逻辑
 */
async function performUseEnvironment(name: string, options?: { 
  autoWrite?: boolean; 
  autoSource?: boolean;
  skipSuccessMessage?: boolean;
}): Promise<void> {
  const result = await envManager.useEnvironment(name, {
    autoWriteShell: options?.autoWrite,
    autoSource: options?.autoSource
  });
  
  if (!options?.skipSuccessMessage) {
    console.log(chalk.green(`✓ Switched to environment "${name}"`));
    console.log(`  Base URL: ${result.env.baseUrl}`);
  }
  
  if (result.shellWriteResult?.success) {
    console.log(chalk.green(`✓ Environment variables written to ${result.shellWriteResult.filePath}`));
    
    if (options?.autoSource) {
      if (result.sourceResult?.success) {
        console.log(chalk.green('✓ Shell configuration sourced automatically'));
        console.log(chalk.yellow('⚠️  Note: Auto-sourcing may not work in all terminal environments'));
      } else {
        console.log(chalk.red(`✗ Failed to source shell config: ${result.sourceResult?.error}`));
        console.log(chalk.cyan('Please run manually: source ~/.bashrc (or ~/.zshrc)'));
      }
    } else {
      // 询问用户是否要自动 source
      const sourceAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'sourceChoice',
          message: 'How would you like to apply the environment variables?',
          choices: [
            { name: 'Manual - I will restart terminal or source manually (Recommended)', value: 'manual' },
            { name: 'Auto-source - Try to source automatically (May not work in all environments)', value: 'auto' }
          ],
          default: 'manual'
        }
      ]);
      
      if (sourceAnswer.sourceChoice === 'auto') {
        console.log(chalk.yellow('⚠️  Attempting auto-source - this may not work in all terminal environments'));
        const sourceResult = await envManager.getShellManager().autoSourceShell();
        
        if (sourceResult.success) {
          console.log(chalk.green('✓ Shell configuration sourced successfully'));
        } else {
          console.log(chalk.red(`✗ Auto-source failed: ${sourceResult.error}`));
          console.log(chalk.cyan('Please run manually: source ~/.bashrc (or ~/.zshrc)'));
        }
      } else {
        console.log(chalk.cyan('To apply changes, restart your terminal or run:'));
        console.log(chalk.cyan('source ~/.bashrc (or ~/.zshrc)'));
      }
    }
  } else if (options?.autoWrite !== false) {
    console.log(chalk.yellow('Environment variables have been set, but may not persist.'));
    console.log(chalk.cyan('Consider running: source <(ccm env)'));
  } else {
    console.log(chalk.yellow('To set environment variables manually, run:'));
    console.log(chalk.cyan('source <(ccm env)'));
  }
}

program
  .name('ccm')
  .description('Claude Code Manager - Manage Claude Code API configurations')
  .version(getPackageVersion());

// 列出所有环境
program
  .command('list')
  .alias('ls')
  .description('List all environment groups')
  .action(() => {
    const environments = envManager.listEnvironments();
    
    if (environments.length === 0) {
      console.log(chalk.yellow('No environment groups found. Use "ccm add" to create one.'));
      return;
    }

    console.log();
    environments.forEach(env => {
      const marker = env.isCurrent ? chalk.green('* ') : '  ';
      const name = env.isCurrent ? chalk.green(env.name) : env.name;
      console.log(`${marker}${name.padEnd(15)} ${env.baseUrl}`);
      
      if (env.lastUsed) {
        const lastUsed = new Date(env.lastUsed).toLocaleDateString();
        console.log(`${' '.repeat(17)} Last used: ${lastUsed}`);
      }
    });
    console.log();
  });

// 添加环境
program
  .command('add <name> <baseUrl> [apiKey]')
  .description('Add a new environment group')
  .option('--no-auto-write', 'Do not automatically write to shell config')
  .action(async (name: string, baseUrl: string, apiKey?: string, options?: { autoWrite: boolean }) => {
    try {
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

      const addOptions: AddEnvOptions = {
        name,
        baseUrl,
        apiKey: apiKey!,
        autoWriteShell: options?.autoWrite
      };

      const env = await envManager.addEnvironment(addOptions);
      console.log(chalk.green(`✓ Added environment group "${name}"`));
      console.log(`  Base URL: ${env.baseUrl}`);
      console.log(`  Created: ${new Date(env.createdAt).toLocaleString()}`);
      
      // 询问是否设为当前环境
      const currentEnv = envManager.getCurrentEnvironment();
      if (!currentEnv || currentEnv.name !== name) {
        const useAnswer = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'useCurrent',
            message: `Set "${name}" as current environment?`,
            default: true
          }
        ]);
        
        if (useAnswer.useCurrent) {
          await performUseEnvironment(name, {
            autoWrite: options?.autoWrite,
            skipSuccessMessage: true // 因为前面已经显示了添加成功的信息
          });
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// 删除环境
program
  .command('remove <name>')
  .alias('rm')
  .description('Remove an environment group')
  .action(async (name: string) => {
    try {
      const env = envManager.getEnvironment(name);
      if (!env) {
        console.error(chalk.red(`✗ Environment "${name}" not found`));
        process.exit(1);
      }

      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to remove environment "${name}"?`,
          default: false
        }
      ]);

      if (answer.confirm) {
        await envManager.removeEnvironment(name);
        console.log(chalk.green(`✓ Removed environment "${name}"`));
      } else {
        console.log(chalk.yellow('Operation cancelled'));
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// 使用环境
program
  .command('use <name>')
  .description('Switch to an environment group')
  .option('--no-auto-write', 'Do not automatically write to shell config')
  .option('--auto-source', 'Automatically source shell config after writing (risky)')
  .action(async (name: string, options?: { autoWrite: boolean; autoSource: boolean }) => {
    try {
      await performUseEnvironment(name, {
        autoWrite: options?.autoWrite,
        autoSource: options?.autoSource
      });
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// 显示当前环境
program
  .command('current')
  .description('Show current environment group')
  .action(() => {
    const currentEnv = envManager.getCurrentEnvironment();
    
    if (!currentEnv) {
      console.log(chalk.yellow('No environment is currently active.'));
      console.log('Use "ccm use <name>" to activate an environment.');
      return;
    }

    console.log();
    console.log(chalk.green(`Current environment: ${currentEnv.name}`));
    console.log(`Base URL: ${currentEnv.baseUrl}`);
    console.log(`API Key: ${'*'.repeat(Math.min(currentEnv.apiKey.length, 20))}`);
    console.log(`Created: ${new Date(currentEnv.createdAt).toLocaleString()}`);
    
    if (currentEnv.lastUsed) {
      console.log(`Last used: ${new Date(currentEnv.lastUsed).toLocaleString()}`);
    }
    console.log();
  });

// 生成环境变量脚本
program
  .command('env')
  .description('Generate shell script to set environment variables')
  .action(() => {
    try {
      const script = envManager.generateEnvScript();
      console.log(script);
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// 测试环境
program
  .command('test [name]')
  .description('Test environment configuration (defaults to current)')
  .action(async (name?: string) => {
    const result = await envManager.testEnvironment(name);
    
    if (result.success) {
      console.log(chalk.green(`✓ ${result.message}`));
    } else {
      console.error(chalk.red(`✗ ${result.message}`));
      if (result.error) {
        console.error(chalk.gray(`Details: ${result.error}`));
      }
      process.exit(1);
    }
  });

// 显示统计信息
program
  .command('status')
  .description('Show CCM status and statistics')
  .action(() => {
    const stats = envManager.getStats();
    const environments = envManager.listEnvironments();
    
    console.log();
    console.log(chalk.blue('CCM Status:'));
    console.log(`Total environments: ${stats.totalEnvironments}`);
    console.log(`Current environment: ${stats.currentEnvironment || 'None'}`);
    console.log(`Shell integration: ${stats.hasShellIntegration ? 'Enabled' : 'Disabled'}`);
    
    if (environments.length > 0) {
      console.log();
      console.log(chalk.blue('Recent environments:'));
      const sortedEnvs = environments
        .filter(env => env.lastUsed)
        .sort((a, b) => new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime())
        .slice(0, 3);
        
      sortedEnvs.forEach(env => {
        const lastUsed = new Date(env.lastUsed!).toLocaleDateString();
        console.log(`  ${env.name} (${lastUsed})`);
      });
    }
    console.log();
  });

// 清除所有配置
program
  .command('clear')
  .alias('clearall')
  .description('Clear all environments and shell integration (DESTRUCTIVE)')
  .action(async () => {
    try {
      // 确认操作
      const confirmAnswer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: chalk.red('⚠️  This will remove ALL environments and shell integration. Are you sure?'),
          default: false
        }
      ]);

      if (!confirmAnswer.confirmed) {
        console.log(chalk.yellow('Operation cancelled.'));
        return;
      }

      // 执行清除
      console.log(chalk.yellow('Clearing CCM configuration...'));
      const result = await envManager.clearAll();

      // 显示结果
      console.log();
      if (result.success) {
        console.log(chalk.green(`✓ ${result.message}`));
      } else {
        console.log(chalk.red(`✗ ${result.message}`));
      }

      // 显示详细信息
      if (result.details.length > 0) {
        console.log();
        result.details.forEach(detail => {
          if (detail.startsWith('✓')) {
            console.log(chalk.green(detail));
          } else if (detail.startsWith('⚠')) {
            console.log(chalk.yellow(detail));
          } else if (detail.startsWith('✗')) {
            console.log(chalk.red(detail));
          } else {
            console.log(detail);
          }
        });
      }

      console.log();
      console.log(chalk.cyan('CCM has been reset to initial state.'));
      console.log(chalk.cyan('You can start fresh with: ccm config'));

    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// 交互式配置
program
  .command('config')
  .description('Interactive configuration')
  .action(async () => {
    const environments = envManager.listEnvironments();
    
    if (environments.length === 0) {
      console.log(chalk.yellow('No environments found. Let\'s create your first one.'));
      
      const answers = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'Environment name:', default: 'default' },
        { type: 'input', name: 'baseUrl', message: 'Base URL:', default: 'https://api.anthropic.com' },
        { type: 'password', name: 'apiKey', message: 'API Key:', mask: '*' },
        { type: 'confirm', name: 'autoWrite', message: 'Automatically write to shell config?', default: true }
      ]);
      
      try {
        await envManager.addEnvironment({
          name: answers.name,
          baseUrl: answers.baseUrl,
          apiKey: answers.apiKey,
          autoWriteShell: answers.autoWrite
        });
        console.log(chalk.green(`✓ Created environment "${answers.name}"`));
      } catch (error) {
        console.error(chalk.red(`✗ Error: ${error}`));
      }
      return;
    }

    const choices = environments.map(env => ({
      name: `${env.name} (${env.baseUrl})${env.isCurrent ? ' [current]' : ''}`,
      value: env.name
    }));

    const action = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Switch environment', value: 'switch' },
          { name: 'Add new environment', value: 'add' },
          { name: 'Edit environment', value: 'edit' },
          { name: 'Remove environment', value: 'remove' },
          { name: 'Show current status', value: 'status' }
        ]
      }
    ]);

    switch (action.action) {
      case 'switch':
        const switchAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'name',
            message: 'Select environment:',
            choices
          }
        ]);
        try {
          await performUseEnvironment(switchAnswer.name);
        } catch (error) {
          console.error(chalk.red(`✗ Error: ${error}`));
        }
        break;

      case 'add':
        const addAnswers = await inquirer.prompt([
          { type: 'input', name: 'name', message: 'Environment name:' },
          { type: 'input', name: 'baseUrl', message: 'Base URL:' },
          { type: 'password', name: 'apiKey', message: 'API Key:', mask: '*' }
        ]);
        try {
          await envManager.addEnvironment(addAnswers);
          console.log(chalk.green(`✓ Added environment "${addAnswers.name}"`));
        } catch (error) {
          console.error(chalk.red(`✗ Error: ${error}`));
        }
        break;

      case 'edit':
        const editEnvAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'name',
            message: 'Select environment to edit:',
            choices
          }
        ]);
        
        const currentConfig = envManager.getEnvironment(editEnvAnswer.name);
        if (currentConfig) {
          const editAnswers = await inquirer.prompt([
            { type: 'input', name: 'baseUrl', message: 'Base URL:', default: currentConfig.baseUrl },
            { type: 'password', name: 'apiKey', message: 'API Key:', mask: '*', default: currentConfig.apiKey }
          ]);
          
          try {
            await envManager.updateEnvironment(editEnvAnswer.name, {
              baseUrl: editAnswers.baseUrl,
              apiKey: editAnswers.apiKey
            });
            console.log(chalk.green(`✓ Updated environment "${editEnvAnswer.name}"`));
          } catch (error) {
            console.error(chalk.red(`✗ Error: ${error}`));
          }
        }
        break;

      case 'status':
        {
          const stats = envManager.getStats();
          const environments = envManager.listEnvironments();
          
          console.log();
          console.log(chalk.blue('CCM Status:'));
          console.log(`Total environments: ${stats.totalEnvironments}`);
          console.log(`Current environment: ${stats.currentEnvironment || 'None'}`);
          console.log(`Shell integration: ${stats.hasShellIntegration ? 'Enabled' : 'Disabled'}`);
          
          if (environments.length > 0) {
            console.log();
            console.log(chalk.blue('Recent environments:'));
            environments
              .sort((a, b) => new Date(b.lastUsed || b.createdAt).getTime() - new Date(a.lastUsed || a.createdAt).getTime())
              .slice(0, 3)
              .forEach(env => {
                const marker = env.isCurrent ? chalk.green('* ') : '  ';
                const name = env.isCurrent ? chalk.green(env.name) : env.name;
                console.log(`${marker}${name.padEnd(15)} ${env.baseUrl}`);
              });
          }
          console.log();
        }
        break;
    }
  });

// 解析命令行参数
program.parse();