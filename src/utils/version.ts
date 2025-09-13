import * as fs from 'fs';
import * as path from 'path';

/**
 * 读取 package.json 中的版本号
 */
export function getPackageVersion(): string {
  try {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version || '0.0.0';
  } catch (error) {
    console.warn('Failed to read package.json version, using fallback');
    return '0.0.0';
  }
}