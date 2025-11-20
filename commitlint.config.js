/**
 * Commitlint 配置 - 非强制模式
 *
 * 目的：
 * - 提示团队使用 Conventional Commits
 * - 不阻塞提交（降级为 warning）
 * - 支持中文 commit message
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],

  // 自定义规则
  rules: {
    // Type 枚举（降级为 warning）
    'type-enum': [
      1, // 1 = warning, 2 = error, 0 = disabled
      'always',
      [
        'feat',     // 新功能
        'fix',      // Bug 修复
        'refactor', // 重构
        'perf',     // 性能优化
        'docs',     // 文档
        'style',    // 代码格式（不影响代码运行的变动）
        'test',     // 测试
        'build',    // 构建系统或外部依赖变动
        'ci',       // CI 配置文件和脚本变动
        'chore',    // 其他不修改 src 或测试文件的变动
        'revert',   // 回退之前的 commit
      ],
    ],

    // 允许中文
    'subject-case': [0], // 禁用大小写检查
    'header-max-length': [0], // 禁用长度限制（中文字符占用更多）

    // 其他规则也降级为 warning
    'type-case': [1, 'always', 'lower-case'],
    'type-empty': [1, 'never'],
    'scope-case': [1, 'always', 'lower-case'],
    'subject-empty': [1, 'never'],
    'subject-full-stop': [0, 'never', '.'],
    'header-full-stop': [0, 'never', '.'],
    'body-leading-blank': [1, 'always'],
    'footer-leading-blank': [1, 'always'],
  },

  // 忽略某些 commit
  ignores: [
    (commit) => commit.includes('WIP'), // Work in Progress
    (commit) => commit.includes('wip'),
  ],

  // 帮助信息（中文）
  helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
}
