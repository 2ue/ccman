module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  env: {
    node: true,
    es2020: true,
  },
  rules: {
    // 基本规则
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    'no-console': 'off', // CLI工具需要console输出
    'no-process-exit': 'off', // CLI工具需要process.exit
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.js', // 忽略根目录的JS配置文件
  ],
};