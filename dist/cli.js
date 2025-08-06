#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const fs_1 = require("fs");
const path_1 = require("path");
const EnvironmentManager_1 = require("./config/EnvironmentManager");
// 动态读取版本号
const getPackageVersion = () => {
    try {
        const packageJsonPath = (0, path_1.join)(__dirname, '../package.json');
        const packageJson = JSON.parse((0, fs_1.readFileSync)(packageJsonPath, 'utf8'));
        return packageJson.version;
    }
    catch (error) {
        console.warn(chalk_1.default.yellow('⚠️  无法读取版本信息，使用默认版本'));
        return '0.0.1';
    }
};
const program = new commander_1.Command();
const envManager = new EnvironmentManager_1.EnvironmentManager();
/**
 * 统一的 use 环境交互逻辑
 */
async function performUseEnvironment(name, options) {
    const result = await envManager.useEnvironment(name, {
        autoWriteShell: options?.autoWrite,
        autoSource: options?.autoSource
    });
    if (!options?.skipSuccessMessage) {
        console.log(chalk_1.default.green(`✓ Switched to environment "${name}"`));
        console.log(`  Base URL: ${result.env.baseUrl}`);
    }
    if (result.shellWriteResult?.success) {
        console.log(chalk_1.default.green(`✓ Environment variables written to ${result.shellWriteResult.filePath}`));
        if (options?.autoSource) {
            if (result.sourceResult?.success) {
                console.log(chalk_1.default.green('✓ Shell configuration sourced automatically'));
                console.log(chalk_1.default.yellow('⚠️  Note: Auto-sourcing may not work in all terminal environments'));
            }
            else {
                console.log(chalk_1.default.red(`✗ Failed to source shell config: ${result.sourceResult?.error}`));
                console.log(chalk_1.default.cyan('Please run manually: source ~/.bashrc (or ~/.zshrc)'));
            }
        }
        else {
            // 询问用户是否要自动 source
            const sourceAnswer = await inquirer_1.default.prompt([
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
                console.log(chalk_1.default.yellow('⚠️  Attempting auto-source - this may not work in all terminal environments'));
                const sourceResult = await envManager.getShellManager().autoSourceShell();
                if (sourceResult.success) {
                    console.log(chalk_1.default.green('✓ Shell configuration sourced successfully'));
                }
                else {
                    console.log(chalk_1.default.red(`✗ Auto-source failed: ${sourceResult.error}`));
                    console.log(chalk_1.default.cyan('Please run manually: source ~/.bashrc (or ~/.zshrc)'));
                }
            }
            else {
                console.log(chalk_1.default.cyan('To apply changes, restart your terminal or run:'));
                console.log(chalk_1.default.cyan('source ~/.bashrc (or ~/.zshrc)'));
            }
        }
    }
    else if (options?.autoWrite !== false) {
        console.log(chalk_1.default.yellow('Environment variables have been set, but may not persist.'));
        console.log(chalk_1.default.cyan('Consider running: source <(ccm env)'));
    }
    else {
        console.log(chalk_1.default.yellow('To set environment variables manually, run:'));
        console.log(chalk_1.default.cyan('source <(ccm env)'));
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
        console.log(chalk_1.default.yellow('No environment groups found. Use "ccm add" to create one.'));
        return;
    }
    console.log();
    environments.forEach(env => {
        const marker = env.isCurrent ? chalk_1.default.green('* ') : '  ';
        const name = env.isCurrent ? chalk_1.default.green(env.name) : env.name;
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
    .action(async (name, baseUrl, apiKey, options) => {
    try {
        if (!apiKey) {
            const answer = await inquirer_1.default.prompt([
                {
                    type: 'password',
                    name: 'apiKey',
                    message: 'Enter API Key:',
                    mask: '*'
                }
            ]);
            apiKey = answer.apiKey;
        }
        const addOptions = {
            name,
            baseUrl,
            apiKey: apiKey,
            autoWriteShell: options?.autoWrite
        };
        const env = await envManager.addEnvironment(addOptions);
        console.log(chalk_1.default.green(`✓ Added environment group "${name}"`));
        console.log(`  Base URL: ${env.baseUrl}`);
        console.log(`  Created: ${new Date(env.createdAt).toLocaleString()}`);
        // 询问是否设为当前环境
        const currentEnv = envManager.getCurrentEnvironment();
        if (!currentEnv || currentEnv.name !== name) {
            const useAnswer = await inquirer_1.default.prompt([
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
    }
    catch (error) {
        console.error(chalk_1.default.red(`✗ Error: ${error}`));
        process.exit(1);
    }
});
// 删除环境
program
    .command('remove <name>')
    .alias('rm')
    .description('Remove an environment group')
    .action(async (name) => {
    try {
        const env = envManager.getEnvironment(name);
        if (!env) {
            console.error(chalk_1.default.red(`✗ Environment "${name}" not found`));
            process.exit(1);
        }
        const answer = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `Are you sure you want to remove environment "${name}"?`,
                default: false
            }
        ]);
        if (answer.confirm) {
            await envManager.removeEnvironment(name);
            console.log(chalk_1.default.green(`✓ Removed environment "${name}"`));
        }
        else {
            console.log(chalk_1.default.yellow('Operation cancelled'));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red(`✗ Error: ${error}`));
        process.exit(1);
    }
});
// 使用环境
program
    .command('use <name>')
    .description('Switch to an environment group')
    .option('--no-auto-write', 'Do not automatically write to shell config')
    .option('--auto-source', 'Automatically source shell config after writing (risky)')
    .action(async (name, options) => {
    try {
        await performUseEnvironment(name, {
            autoWrite: options?.autoWrite,
            autoSource: options?.autoSource
        });
    }
    catch (error) {
        console.error(chalk_1.default.red(`✗ Error: ${error}`));
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
        console.log(chalk_1.default.yellow('No environment is currently active.'));
        console.log('Use "ccm use <name>" to activate an environment.');
        return;
    }
    console.log();
    console.log(chalk_1.default.green(`Current environment: ${currentEnv.name}`));
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
    }
    catch (error) {
        console.error(chalk_1.default.red(`✗ Error: ${error}`));
        process.exit(1);
    }
});
// 测试环境
program
    .command('test [name]')
    .description('Test environment configuration (defaults to current)')
    .action(async (name) => {
    const result = await envManager.testEnvironment(name);
    if (result.success) {
        console.log(chalk_1.default.green(`✓ ${result.message}`));
    }
    else {
        console.error(chalk_1.default.red(`✗ ${result.message}`));
        if (result.error) {
            console.error(chalk_1.default.gray(`Details: ${result.error}`));
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
    console.log(chalk_1.default.blue('CCM Status:'));
    console.log(`Total environments: ${stats.totalEnvironments}`);
    console.log(`Current environment: ${stats.currentEnvironment || 'None'}`);
    console.log(`Shell integration: ${stats.hasShellIntegration ? 'Enabled' : 'Disabled'}`);
    if (environments.length > 0) {
        console.log();
        console.log(chalk_1.default.blue('Recent environments:'));
        const sortedEnvs = environments
            .filter(env => env.lastUsed)
            .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
            .slice(0, 3);
        sortedEnvs.forEach(env => {
            const lastUsed = new Date(env.lastUsed).toLocaleDateString();
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
        const confirmAnswer = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: chalk_1.default.red('⚠️  This will remove ALL environments and shell integration. Are you sure?'),
                default: false
            }
        ]);
        if (!confirmAnswer.confirmed) {
            console.log(chalk_1.default.yellow('Operation cancelled.'));
            return;
        }
        // 执行清除
        console.log(chalk_1.default.yellow('Clearing CCM configuration...'));
        const result = await envManager.clearAll();
        // 显示结果
        console.log();
        if (result.success) {
            console.log(chalk_1.default.green(`✓ ${result.message}`));
        }
        else {
            console.log(chalk_1.default.red(`✗ ${result.message}`));
        }
        // 显示详细信息
        if (result.details.length > 0) {
            console.log();
            result.details.forEach(detail => {
                if (detail.startsWith('✓')) {
                    console.log(chalk_1.default.green(detail));
                }
                else if (detail.startsWith('⚠')) {
                    console.log(chalk_1.default.yellow(detail));
                }
                else if (detail.startsWith('✗')) {
                    console.log(chalk_1.default.red(detail));
                }
                else {
                    console.log(detail);
                }
            });
        }
        console.log();
        console.log(chalk_1.default.cyan('CCM has been reset to initial state.'));
        console.log(chalk_1.default.cyan('You can start fresh with: ccm config'));
    }
    catch (error) {
        console.error(chalk_1.default.red(`✗ Error: ${error}`));
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
        console.log(chalk_1.default.yellow('No environments found. Let\'s create your first one.'));
        const answers = await inquirer_1.default.prompt([
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
            console.log(chalk_1.default.green(`✓ Created environment "${answers.name}"`));
        }
        catch (error) {
            console.error(chalk_1.default.red(`✗ Error: ${error}`));
        }
        return;
    }
    const choices = environments.map(env => ({
        name: `${env.name} (${env.baseUrl})${env.isCurrent ? ' [current]' : ''}`,
        value: env.name
    }));
    const action = await inquirer_1.default.prompt([
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
            const switchAnswer = await inquirer_1.default.prompt([
                {
                    type: 'list',
                    name: 'name',
                    message: 'Select environment:',
                    choices
                }
            ]);
            try {
                await performUseEnvironment(switchAnswer.name);
            }
            catch (error) {
                console.error(chalk_1.default.red(`✗ Error: ${error}`));
            }
            break;
        case 'add':
            const addAnswers = await inquirer_1.default.prompt([
                { type: 'input', name: 'name', message: 'Environment name:' },
                { type: 'input', name: 'baseUrl', message: 'Base URL:' },
                { type: 'password', name: 'apiKey', message: 'API Key:', mask: '*' }
            ]);
            try {
                await envManager.addEnvironment(addAnswers);
                console.log(chalk_1.default.green(`✓ Added environment "${addAnswers.name}"`));
            }
            catch (error) {
                console.error(chalk_1.default.red(`✗ Error: ${error}`));
            }
            break;
        case 'edit':
            const editEnvAnswer = await inquirer_1.default.prompt([
                {
                    type: 'list',
                    name: 'name',
                    message: 'Select environment to edit:',
                    choices
                }
            ]);
            const currentConfig = envManager.getEnvironment(editEnvAnswer.name);
            if (currentConfig) {
                const editAnswers = await inquirer_1.default.prompt([
                    { type: 'input', name: 'baseUrl', message: 'Base URL:', default: currentConfig.baseUrl },
                    { type: 'password', name: 'apiKey', message: 'API Key:', mask: '*', default: currentConfig.apiKey }
                ]);
                try {
                    await envManager.updateEnvironment(editEnvAnswer.name, {
                        baseUrl: editAnswers.baseUrl,
                        apiKey: editAnswers.apiKey
                    });
                    console.log(chalk_1.default.green(`✓ Updated environment "${editEnvAnswer.name}"`));
                }
                catch (error) {
                    console.error(chalk_1.default.red(`✗ Error: ${error}`));
                }
            }
            break;
        case 'status':
            {
                const stats = envManager.getStats();
                const environments = envManager.listEnvironments();
                console.log();
                console.log(chalk_1.default.blue('CCM Status:'));
                console.log(`Total environments: ${stats.totalEnvironments}`);
                console.log(`Current environment: ${stats.currentEnvironment || 'None'}`);
                console.log(`Shell integration: ${stats.hasShellIntegration ? 'Enabled' : 'Disabled'}`);
                if (environments.length > 0) {
                    console.log();
                    console.log(chalk_1.default.blue('Recent environments:'));
                    environments
                        .sort((a, b) => new Date(b.lastUsed || b.createdAt).getTime() - new Date(a.lastUsed || a.createdAt).getTime())
                        .slice(0, 3)
                        .forEach(env => {
                        const marker = env.isCurrent ? chalk_1.default.green('* ') : '  ';
                        const name = env.isCurrent ? chalk_1.default.green(env.name) : env.name;
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
//# sourceMappingURL=cli.js.map