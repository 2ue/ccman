import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 版本信息接口
 */
export interface VersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

/**
 * 版本工具类
 */
export class VersionManager {
  private static instance: VersionManager;
  private cachedVersion?: VersionInfo;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): VersionManager {
    if (!VersionManager.instance) {
      VersionManager.instance = new VersionManager();
    }
    return VersionManager.instance;
  }

  /**
   * 获取当前版本信息
   */
  getCurrentVersion(): VersionInfo {
    if (this.cachedVersion) {
      return this.cachedVersion;
    }

    try {
      const packageJsonPath = this.getPackageJsonPath();
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const version = packageJson.version;
      
      this.cachedVersion = this.parseVersion(version);
      return this.cachedVersion;
    } catch (error) {
      console.warn('⚠️  无法读取版本信息，使用默认版本');
      this.cachedVersion = this.parseVersion('0.0.1');
      return this.cachedVersion;
    }
  }

  /**
   * 获取版本字符串
   */
  getVersionString(): string {
    return this.getCurrentVersion().version;
  }

  /**
   * 解析版本字符串
   */
  private parseVersion(versionString: string): VersionInfo {
    const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    
    if (!match) {
      throw new Error(`无效的版本格式: ${versionString}`);
    }

    const [, major, minor, patch, prerelease] = match;
    
    return {
      version: versionString,
      major: parseInt(major, 10),
      minor: parseInt(minor, 10),
      patch: parseInt(patch, 10),
      prerelease
    };
  }

  /**
   * 获取 package.json 路径
   */
  private getPackageJsonPath(): string {
    // 在构建后的环境中，package.json 在 ../package.json
    // 在开发环境中，可能在不同的位置
    const paths = [
      join(__dirname, '../package.json'),      // 构建后
      join(__dirname, '../../package.json'),   // 开发环境
      join(process.cwd(), 'package.json')      // 当前工作目录
    ];

    for (const path of paths) {
      try {
        readFileSync(path, 'utf8');
        return path;
      } catch {
        continue;
      }
    }

    throw new Error('找不到 package.json 文件');
  }

  /**
   * 预测下一个版本
   */
  getNextVersion(type: 'patch' | 'minor' | 'major'): string {
    const current = this.getCurrentVersion();
    
    switch (type) {
      case 'patch':
        return `${current.major}.${current.minor}.${current.patch + 1}`;
      case 'minor':
        return `${current.major}.${current.minor + 1}.0`;
      case 'major':
        return `${current.major + 1}.0.0`;
      default:
        throw new Error(`不支持的版本类型: ${type}`);
    }
  }

  /**
   * 获取版本变更建议（基于 git 历史分析）
   */
  async getVersionSuggestion(): Promise<'patch' | 'minor' | 'major'> {
    try {
      // 这里可以添加 git 历史分析逻辑
      // 比如分析提交信息中的关键词来推荐版本类型
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // 获取最近的提交信息
      const { stdout } = await execAsync('git log --oneline -10');
      const commits = stdout.toLowerCase();

      // 简单的启发式规则
      if (commits.includes('breaking') || commits.includes('major')) {
        return 'major';
      } else if (commits.includes('feat') || commits.includes('feature') || commits.includes('add')) {
        return 'minor';
      } else {
        return 'patch';
      }
    } catch {
      // 默认推荐 patch
      return 'patch';
    }
  }

  /**
   * 清除缓存（测试用）
   */
  clearCache(): void {
    this.cachedVersion = undefined;
  }
}

/**
 * 便捷函数：获取当前版本字符串
 */
export function getCurrentVersion(): string {
  return VersionManager.getInstance().getVersionString();
}

/**
 * 便捷函数：获取版本信息
 */
export function getVersionInfo(): VersionInfo {
  return VersionManager.getInstance().getCurrentVersion();
}

/**
 * 便捷函数：获取下一个版本
 */
export function getNextVersion(type: 'patch' | 'minor' | 'major'): string {
  return VersionManager.getInstance().getNextVersion(type);
}

/**
 * 便捷函数：获取版本建议
 */
export async function getVersionSuggestion(): Promise<'patch' | 'minor' | 'major'> {
  return VersionManager.getInstance().getVersionSuggestion();
}