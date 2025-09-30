#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ProviderManager } from './providers/ProviderManager';
import { AddProviderOptions } from './types';
import { LanguageManager } from './i18n/LanguageManager';
import { createLanguageCommands } from './commands/lang';
import { getPackageVersion } from './utils/version';
import { createProviderChoices, DefaultProvider } from './config/default-providers';
import { EnvironmentManager } from './core/EnvironmentManager';

const program = new Command();
const providerManager = new ProviderManager();
const languageManager = new LanguageManager();

// 询问是否继续操作
async function askToContinue(): Promise<boolean> {
  const messages = await languageManager.getMessages();
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'continue',
      message: messages.forms.continueOperation,
      default: true
    }
  ]);
  return answer.continue;
}

// 交互式配置菜单
async function showInteractiveMenu(): Promise<void> {
  // 处理首次运行语言设置
  await languageManager.handleFirstRun();
  
  // 获取当前语言的消息
  const messages = await languageManager.getMessages();
  
  // 设置 Ctrl+C 优雅退出处理
  process.removeAllListeners('SIGINT');
  process.on('SIGINT', () => {
    console.log(chalk.yellow(messages.interruptMessage));
    process.exit(0);
  });

  try {
    let shouldContinue = true;

    while (shouldContinue) {
      await providerManager.init();
      const providers = await providerManager.listProviders();
      
      if (providers.length === 0) {
        console.log(chalk.yellow(messages.noProvidersFound));
        console.log(chalk.cyan('📝 选择一个预设供应商或手动配置：'));
        console.log();

        // 显示供应商选择菜单
        let providerChoice;
        do {
          providerChoice = await inquirer.prompt([
            {
              type: 'list',
              name: 'provider',
              message: '选择供应商:',
              choices: createProviderChoices(),
              pageSize: 10
            }
          ]);
        } while (providerChoice.provider === 'separator');

        let answers: any;

        if (providerChoice.provider === 'custom') {
          // 手动输入
          answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: messages.forms.providerName
            },
            {
              type: 'input',
              name: 'description',
              message: messages.forms.description,
              default: ''
            },
            {
              type: 'input',
              name: 'baseUrl',
              message: messages.forms.baseUrl
            },
            {
              type: 'password',
              name: 'apiKey',
              message: messages.forms.apiKey,
              mask: '*'
            }
          ]);
        } else {
          // 使用预设供应商
          const selectedProvider = providerChoice.provider as DefaultProvider;
          console.log(chalk.green(`已选择：${selectedProvider.name}`));
          console.log(`URL: ${chalk.cyan(selectedProvider.baseUrl)}`);
          console.log();

          answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: '供应商名称:',
              default: selectedProvider.name
            },
            {
              type: 'input',
              name: 'description',
              message: '描述:',
              default: selectedProvider.description
            },
            {
              type: 'input',
              name: 'baseUrl',
              message: '基础URL:',
              default: selectedProvider.baseUrl
            },
            {
              type: 'password',
              name: 'apiKey',
              message: 'API密钥:',
              mask: '*'
            }
          ]);
        }
        
        const result = await providerManager.addProvider({
          name: answers.name,
          description: answers.description,
          baseUrl: answers.baseUrl,
          apiKey: answers.apiKey
        });
        
        if (result.success) {
          console.log(chalk.green(`✓ ${result.message}`));
          
          // 获取生成的provider ID并自动设为当前供应商
          const providerId = result.data?.providerId;
          if (providerId) {
            const useResult = await providerManager.useProvider(providerId);
            if (useResult.success) {
              console.log(chalk.green(`✓ ${useResult.message}`));
            }
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
          message: messages.mainMenuTitle,
          choices: [
            { name: messages.mainMenuOptions.switchProvider, value: 'switch' },
            { name: messages.mainMenuOptions.addProvider, value: 'add' },
            { name: messages.mainMenuOptions.updateProvider, value: 'update' },
            { name: messages.mainMenuOptions.removeProvider, value: 'remove' },
            { name: messages.mainMenuOptions.showStatus, value: 'status' },
            new inquirer.Separator(),
            { name: messages.mainMenuOptions.doctor, value: 'doctor' },
            { name: messages.mainMenuOptions.setup, value: 'setup' },
            new inquirer.Separator(),
            { name: messages.mainMenuOptions.exit, value: 'exit' }
          ]
        }
      ]);

      if (action.action === 'exit') {
        console.log(chalk.cyan(messages.exitMessage));
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
        // 先让用户选择是使用预设供应商还是自定义
        let providerTypeAnswer;
        do {
          providerTypeAnswer = await inquirer.prompt([
            {
              type: 'list',
              name: 'providerChoice',
              message: '请选择供应商类型:',
              choices: createProviderChoices()
            }
          ]);
        } while (providerTypeAnswer.providerChoice === 'separator');

        let addAnswers: any;

        if (providerTypeAnswer.providerChoice === 'custom') {
          // 用户选择自定义，手动输入所有信息
          addAnswers = await inquirer.prompt([
            { type: 'input', name: 'name', message: 'Provider name:' },
            { type: 'input', name: 'description', message: 'Description:' },
            { type: 'input', name: 'baseUrl', message: 'Base URL:' },
            { type: 'password', name: 'apiKey', message: 'API Key:', mask: '*' }
          ]);
        } else {
          // 用户选择了预设供应商，使用预设信息
          const selectedProvider = providerTypeAnswer.providerChoice as DefaultProvider;
          addAnswers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Provider name:',
              default: selectedProvider.name
            },
            {
              type: 'input',
              name: 'description',
              message: 'Description:',
              default: selectedProvider.description
            },
            {
              type: 'input',
              name: 'baseUrl',
              message: 'Base URL:',
              default: selectedProvider.baseUrl
            },
            { type: 'password', name: 'apiKey', message: 'API Key:', mask: '*' }
          ]);
        }
        
        const addResult = await providerManager.addProvider(addAnswers);
        if (addResult.success) {
          console.log(chalk.green(`✓ ${addResult.message}`));
          
          // 获取生成的provider ID并询问是否设为当前供应商
          const providerId = addResult.data?.providerId;
          if (providerId) {
            const useAnswer = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'useCurrent',
                message: `Set "${addAnswers.name}" as current provider?`,
                default: true
              }
            ]);
            
            if (useAnswer.useCurrent) {
              const useResult = await providerManager.useProvider(providerId);
              if (useResult.success) {
                console.log(chalk.green(`✓ ${useResult.message}`));
              } else {
                console.error(chalk.red(`✗ ${useResult.message}`));
              }
            }
          }
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

      case 'doctor': {
        const envManager = new EnvironmentManager();
        const checkResult = await envManager.checkEnvironment();

        console.log();
        console.log(chalk.blue(`🔍 ${messages.environment.checkTitle}`));
        console.log();

        // Claude Code 状态
        if (checkResult.claudeCode.installed) {
          console.log(chalk.green(`${messages.environment.claudeCode}: ✓ ${messages.environment.installed}`));
          if (checkResult.claudeCode.version) {
            console.log(`  ${messages.environment.version}: ${checkResult.claudeCode.version}`);
          }
          if (checkResult.claudeCode.path) {
            console.log(`  ${messages.environment.path}: ${checkResult.claudeCode.path}`);
          }
        } else {
          console.log(chalk.red(`${messages.environment.claudeCode}: ✗ ${messages.environment.notInstalled}`));
        }
        console.log();

        // Node.js 状态
        if (checkResult.node.installed) {
          const versionStatus = checkResult.node.versionValid ? chalk.green('✓') : chalk.yellow('⚠️');
          console.log(`${chalk.green(messages.environment.nodeJs + ':')} ${versionStatus} ${messages.environment.installed}`);
          console.log(`  ${messages.environment.version}: ${checkResult.node.version}`);
          console.log(`  ${messages.environment.required}: ${checkResult.requirements.nodeVersion}`);
          if (checkResult.node.path) {
            console.log(`  ${messages.environment.path}: ${checkResult.node.path}`);
          }
        } else {
          console.log(chalk.red(`${messages.environment.nodeJs}: ✗ ${messages.environment.notInstalled}`));
        }
        console.log();

        // npm 状态
        if (checkResult.npm.installed) {
          console.log(chalk.green(`${messages.environment.npm}: ✓ ${messages.environment.installed}`));
          if (checkResult.npm.version) {
            console.log(`  ${messages.environment.version}: ${checkResult.npm.version}`);
          }
          if (checkResult.npm.path) {
            console.log(`  ${messages.environment.path}: ${checkResult.npm.path}`);
          }
        } else {
          console.log(chalk.yellow(`${messages.environment.npm}: ✗ ${messages.environment.notInstalled}`));
        }
        console.log();

        // 版本管理器
        const managers = [];
        if (checkResult.versionManagers.volta) managers.push('volta');
        if (checkResult.versionManagers.nvm) managers.push('nvm');

        if (managers.length > 0) {
          console.log(chalk.blue(`${messages.environment.versionManagers}:`));
          managers.forEach(m => console.log(`  ✓ ${m}`));
          console.log();
        }

        // 问题列表
        if (checkResult.issues.length > 0) {
          console.log(chalk.yellow(`⚠️  ${messages.environment.issues}:`));
          checkResult.issues.forEach(issue => console.log(`  - ${issue}`));
          console.log();
        }

        // 建议
        if (checkResult.suggestions.length > 0) {
          console.log(chalk.cyan(`💡 ${messages.environment.suggestions}:`));
          checkResult.suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
          console.log();
        }

        // 总体状态
        if (checkResult.status === 'ready') {
          console.log(chalk.green(`✅ ${messages.environment.ready}`));
        } else if (checkResult.status === 'warning') {
          console.log(chalk.yellow(`⚠️  ${messages.environment.hasWarnings}`));
        } else {
          console.log(chalk.red(`❌ ${messages.environment.notReady}`));
        }
        console.log();

        console.log();
        shouldContinue = await askToContinue();
        break;
      }

      case 'setup': {
        const envManager = new EnvironmentManager();

        console.log(chalk.blue(`🔍 ${messages.environment.checkingEnvironment}`));
        const checkResult = await envManager.checkEnvironment();

        console.log();
        console.log(`${messages.environment.environmentStatus}:`);
        console.log(`  ${messages.environment.claudeCode}: ${checkResult.claudeCode.installed ? '✓' : '✗'}`);
        console.log(`  ${messages.environment.nodeJs}: ${checkResult.node.installed && checkResult.node.versionValid ? '✓' : '✗'}`);
        console.log();

        if (checkResult.status === 'ready') {
          console.log(chalk.green(`✅ ${messages.environment.ready}!`));
          console.log(messages.environment.noSetupNeeded);
        } else {
          const plan = await envManager.generateInstallPlan(checkResult);

          if (plan.needsNode) {
            console.log(chalk.yellow(`⚠️  ${messages.environment.nodeJs} ${messages.environment.needsInstallOrUpgrade}`));
            console.log();
            console.log(`${messages.environment.availableOptions}:`);
            console.log();

            const optionChoices = plan.nodeOptions.map((opt, idx) => ({
              name: `${idx + 1}. ${opt.name}${opt.reason ? ` (${opt.reason})` : ''}`,
              value: idx,
              short: opt.name
            }));

            const optionAnswer = await inquirer.prompt([
              {
                type: 'list',
                name: 'option',
                message: messages.environment.selectMethod + ':',
                choices: optionChoices
              }
            ]);

            const selectedOption = plan.nodeOptions[optionAnswer.option];
            console.log();
            console.log(chalk.cyan(`${messages.environment.selected}: ${selectedOption.name}`));
            if (selectedOption.description) {
              console.log(chalk.gray(`  ${selectedOption.description}`));
            }
            console.log();

            console.log(chalk.blue(`${messages.environment.installSteps}:`));
            selectedOption.steps.forEach((step, idx) => {
              console.log(`  ${idx + 1}. ${step.description}`);
              console.log(chalk.gray(`     $ ${step.command}`));
            });
            console.log();

            const confirmAnswer = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirm',
                message: messages.environment.proceedInstall,
                default: true
              }
            ]);

            if (confirmAnswer.confirm) {
              const { Installer } = await import('./setup/installer');
              const installer = new Installer({ dryRun: true });
              await installer.executeSteps(selectedOption.steps);
            } else {
              console.log(chalk.yellow(messages.environment.installCancelled));
            }
          }

          if (plan.needsClaudeCode) {
            console.log();
            console.log(chalk.yellow(`⚠️  ${messages.environment.claudeCode} ${messages.environment.needsInstallOrUpgrade}`));
            console.log();
            console.log(chalk.blue(`${messages.environment.installSteps}:`));
            plan.claudeCodeSteps.forEach((step, idx) => {
              console.log(`  ${idx + 1}. ${step.description}`);
              console.log(chalk.gray(`     $ ${step.command}`));
            });
            console.log();

            const confirmAnswer = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirm',
                message: messages.environment.proceedInstall,
                default: true
              }
            ]);

            if (confirmAnswer.confirm) {
              const { Installer } = await import('./setup/installer');
              const installer = new Installer({ dryRun: true });
              await installer.executeSteps(plan.claudeCodeSteps);
            } else {
              console.log(chalk.yellow(messages.environment.installCancelled));
            }
          }
        }

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
  .version(getPackageVersion())
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
      const stats = await providerManager.getStats();
      
      // 显示状态和配置信息，不管是否有providers
      console.log();
      console.log(chalk.blue('CCM Status:'));
      console.log(`Total providers: ${stats.totalProviders}`);
      console.log(`Current provider: ${stats.currentProvider || 'None'}`);
      console.log(`Environment: ${stats.environment}`);
      console.log();
      
      console.log(chalk.blue('Configuration Files:'));
      console.log(`Claude config: ${chalk.cyan(stats.claudeConfigPath)}`);
      console.log(`CCM config: ${chalk.cyan(stats.ccmConfigFile)}`);
      console.log(`Providers dir: ${chalk.cyan(stats.providersDir)}`);
      console.log();
      
      if (providers.length === 0) {
        console.log(chalk.yellow('No provider configurations found. Use "ccman add" to create one.'));
        return;
      }

      if (options?.brief) {
        // 简洁模式
        providers.forEach(provider => {
          const marker = provider.isCurrent ? chalk.green('* ') : '  ';
          const name = provider.isCurrent ? chalk.green(provider.name) : provider.name;
          console.log(`${marker}${name} (${provider.id})`);
        });
        console.log();
        return;
      }

      // 详细显示providers信息
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
  .command('add-interactive')
  .alias('addi')
  .description('Add a new provider configuration interactively (with preset options)')
  .action(async () => {
    try {
      await providerManager.init();

      // 让用户选择预设供应商或自定义
      let providerTypeAnswer;
      do {
        providerTypeAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'providerChoice',
            message: '请选择供应商类型:',
            choices: createProviderChoices()
          }
        ]);
      } while (providerTypeAnswer.providerChoice === 'separator');

      let addAnswers: any;

      if (providerTypeAnswer.providerChoice === 'custom') {
        // 用户选择自定义，手动输入所有信息
        addAnswers = await inquirer.prompt([
          { type: 'input', name: 'name', message: 'Provider name:' },
          { type: 'input', name: 'description', message: 'Description:' },
          { type: 'input', name: 'baseUrl', message: 'Base URL:' },
          { type: 'password', name: 'apiKey', message: 'API Key:', mask: '*' }
        ]);
      } else {
        // 用户选择了预设供应商，使用预设信息
        const selectedProvider = providerTypeAnswer.providerChoice as DefaultProvider;
        addAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Provider name:',
            default: selectedProvider.name
          },
          {
            type: 'input',
            name: 'description',
            message: 'Description:',
            default: selectedProvider.description
          },
          {
            type: 'input',
            name: 'baseUrl',
            message: 'Base URL:',
            default: selectedProvider.baseUrl
          },
          { type: 'password', name: 'apiKey', message: 'API Key:', mask: '*' }
        ]);
      }

      const result = await providerManager.addProvider(addAnswers);

      if (result.success) {
        console.log(chalk.green(`✓ ${result.message}`));

        // 获取生成的provider ID
        const providerId = result.data?.providerId;

        // 询问是否设为当前供应商
        const currentProvider = await providerManager.getCurrentProvider();
        if (!currentProvider || currentProvider.config.name !== addAnswers.name) {
          const useAnswer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'useCurrent',
              message: `Set "${addAnswers.name}" as current provider?`,
              default: true
            }
          ]);

          if (useAnswer.useCurrent && providerId) {
            const useResult = await providerManager.useProvider(providerId);
            if (useResult.success) {
              console.log(chalk.green(`✓ ${useResult.message}`));
            }
          }
        }
      } else {
        console.error(chalk.red(`✗ ${result.message}`));
      }
    } catch (error) {
      console.error(chalk.red('Error adding provider:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// 命令行添加供应商
program
  .command('add <name> <baseUrl> [apiKey]')
  .description('Add a new provider configuration (command line mode)')
  .option('-d, --description <desc>', 'Provider description (defaults to provider name)')
  .action(async (name: string, baseUrl: string, apiKey?: string, options?: { description?: string }) => {
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
        name,
        description: options?.description,
        baseUrl,
        apiKey: apiKey!
      };

      const result = await providerManager.addProvider(addOptions);
      
      if (result.success) {
        console.log(chalk.green(`✓ ${result.message}`));
        
        // 获取生成的provider ID
        const providerId = result.data?.providerId;
        
        // 询问是否设为当前供应商
        const currentProvider = await providerManager.getCurrentProvider();
        if (!currentProvider || currentProvider.config.name !== name) {
          const useAnswer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'useCurrent',
              message: `Set "${name}" as current provider?`,
              default: true
            }
          ]);
          
          if (useAnswer.useCurrent && providerId) {
            const useResult = await providerManager.useProvider(providerId);
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

// 添加语言管理命令
program.addCommand(createLanguageCommands());

// 解析命令行参数
program.parse(process.argv);