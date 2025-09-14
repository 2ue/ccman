#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 构建时环境配置生成器
 * 根据NODE_ENV加载对应的.env文件并生成静态配置
 */

function main() {
  const nodeEnv = process.env.NODE_ENV || 'production';
  const envFile = `.env.${nodeEnv}`;
  const envPath = path.join(__dirname, '..', envFile);
  
  console.log(`🔧 Building environment config for: ${nodeEnv}`);
  console.log(`📂 Loading env file: ${envFile}`);
  
  // 检查环境文件是否存在
  if (!fs.existsSync(envPath)) {
    console.error(`❌ Environment file not found: ${envFile}`);
    process.exit(1);
  }
  
  // 读取并解析环境文件
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  console.log(`✅ Loaded ${Object.keys(envVars).length} environment variables`);
  
  // 生成静态配置文件
  const staticEnvContent = `/**
 * 静态环境配置
 * 此文件由 scripts/build-env.js 在编译时自动生成
 * ⚠️ 请勿手动修改此文件
 */

export const STATIC_ENV = {
  NODE_ENV: '${nodeEnv}',
  BUILD_TIME: '${new Date().toISOString()}',
  ${Object.entries(envVars).map(([key, value]) => `${key}: '${value}'`).join(',\n  ')}
} as const;

export const CCM_CONFIG_DIR = STATIC_ENV.CCM_CONFIG_DIR;
export const CLAUDE_CONFIG_PATH = STATIC_ENV.CLAUDE_CONFIG_PATH;
`;
  
  // 确保目录存在
  const staticEnvDir = path.join(__dirname, '..', 'src', 'config');
  if (!fs.existsSync(staticEnvDir)) {
    fs.mkdirSync(staticEnvDir, { recursive: true });
  }
  
  // 写入静态配置文件
  const staticEnvPath = path.join(staticEnvDir, 'static-env.ts');
  fs.writeFileSync(staticEnvPath, staticEnvContent);
  
  console.log(`📝 Generated static config: src/config/static-env.ts`);
  console.log(`🎯 Environment: ${nodeEnv}`);
  console.log(`📋 Variables: ${Object.keys(envVars).join(', ')}`);
}

if (require.main === module) {
  main();
}