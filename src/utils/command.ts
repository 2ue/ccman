/**
 * 命令执行工具函数
 */
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 命令执行结果
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

/**
 * 命令执行选项
 */
export interface CommandOptions {
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
}

/**
 * 执行命令
 */
export async function executeCommand(
  cmd: string,
  options?: CommandOptions
): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: options?.timeout || 30000,
      cwd: options?.cwd,
      env: { ...process.env, ...options?.env }
    });

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      code: 0
    };
  } catch (error: any) {
    return {
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message,
      code: error.code || 1
    };
  }
}

/**
 * 检查命令是否存在
 */
export async function commandExists(cmd: string): Promise<boolean> {
  const checkCmd = process.platform === 'win32'
    ? `where ${cmd}`
    : `command -v ${cmd}`;

  const result = await executeCommand(checkCmd);
  return result.code === 0;
}

/**
 * 获取命令版本
 */
export async function getCommandVersion(cmd: string): Promise<string | null> {
  const result = await executeCommand(`${cmd} --version`);

  if (result.code !== 0) {
    return null;
  }

  // 提取版本号（匹配常见格式 x.y.z）
  const versionMatch = result.stdout.match(/\d+\.\d+\.\d+/);
  return versionMatch ? versionMatch[0] : result.stdout.split('\n')[0];
}

/**
 * 获取命令路径
 */
export async function getCommandPath(cmd: string): Promise<string | null> {
  const checkCmd = process.platform === 'win32'
    ? `where ${cmd}`
    : `which ${cmd}`;

  const result = await executeCommand(checkCmd);

  if (result.code !== 0) {
    return null;
  }

  // Windows 的 where 可能返回多个路径，取第一个
  return result.stdout.split('\n')[0].trim();
}