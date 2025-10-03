/**
 * 安装执行器
 */
import chalk from 'chalk';
import { InstallStep, InstallationResult, InstallerOptions } from './types';

/**
 * 安装执行器类
 */
export class Installer {
  private options: InstallerOptions;

  constructor(options: InstallerOptions = {}) {
    this.options = {
      dryRun: options.dryRun ?? false,
      auto: options.auto ?? false
    };
  }

  /**
   * 执行安装步骤
   */
  async executeSteps(steps: InstallStep[]): Promise<InstallationResult> {
    const stepsExecuted: string[] = [];
    const stepsFailed: string[] = [];

    console.log();
    if (this.options.dryRun) {
      console.log(chalk.yellow('🔍 演示模式: 不会真正执行安装命令'));
      console.log();
    }

    for (const step of steps) {
      console.log(chalk.blue(`➤ ${step.description}`));

      // 跳过可选步骤的提示
      if (step.optional) {
        console.log(chalk.gray('  (可选步骤，可以跳过)'));
      }

      // 手动步骤
      if (step.manual) {
        console.log(chalk.cyan(`  📋 ${step.command}`));
        console.log(chalk.gray('  请手动完成此步骤'));
        stepsExecuted.push(step.name);
        console.log();
        continue;
      }

      // 显示命令
      console.log(chalk.gray(`  $ ${step.command}`));

      // Dry run 模式：不执行，只显示
      if (this.options.dryRun) {
        console.log(chalk.green('  ✓ (演示模式，未实际执行)'));
        stepsExecuted.push(step.name);
        console.log();
        continue;
      }

      // 实际执行模式（当前不实现，避免真正安装）
      // 如果需要实际执行，取消下面的注释
      /*
      try {
        const result = await executeCommand(step.command, { timeout: 120000 });

        if (result.code === 0) {
          console.log(chalk.green('  ✓ 完成'));
          stepsExecuted.push(step.name);
        } else {
          console.log(chalk.red('  ✗ 失败'));
          console.log(chalk.red(`  Error: ${result.stderr}`));
          stepsFailed.push(step.name);

          if (!step.optional) {
            // 非可选步骤失败，终止安装
            break;
          }
        }
      } catch (error) {
        console.log(chalk.red('  ✗ 执行出错'));
        console.log(chalk.red(`  ${error}`));
        stepsFailed.push(step.name);

        if (!step.optional) {
          break;
        }
      }
      */

      // 当前版本：所有非手动步骤在非 dry-run 模式下也只显示
      console.log(chalk.yellow('  ⚠️  实际执行功能尚未启用（避免意外安装）'));
      stepsExecuted.push(step.name);
      console.log();
    }

    const success = stepsFailed.length === 0;
    const message = success
      ? `✅ 所有步骤完成 (${stepsExecuted.length}/${steps.length})`
      : `⚠️  部分步骤失败 (${stepsFailed.length} 失败)`;

    return {
      success,
      message,
      stepsExecuted,
      stepsFailed
    };
  }

  /**
   * 设置选项
   */
  setOptions(options: InstallerOptions): void {
    this.options = { ...this.options, ...options };
  }
}