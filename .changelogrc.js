/**
 * Changelog 生成配置
 *
 * 支持中文 commit 和非标准格式
 * 使用 emoji 和中文标题
 */

module.exports = Promise.resolve({
  writerOpts: {
    transform: (commit, context) => {
      // 跳过版本 bump commit
      if (commit.subject && commit.subject.includes('bump version')) {
        return
      }

      // 自定义类型标题（中文 + emoji）
      const typeMapping = {
        feat: '✨ 新功能',
        fix: '🐛 问题修复',
        refactor: '♻️ 代码重构',
        perf: '⚡ 性能优化',
        docs: '📝 文档更新',
        style: '💄 代码格式',
        test: '✅ 测试',
        build: '📦 构建系统',
        ci: '👷 CI/CD',
        chore: '🔧 其他变更',
        revert: '⏪ 回退',
      }

      // 返回新对象，不修改原始对象
      return {
        ...commit,
        type: commit.type ? (typeMapping[commit.type] || commit.type) : commit.type,
      }
    },
    commitPartial: `* {{#if scope}}**{{scope}}:** {{/if}}{{subject}} ({{hash}})`,
  },

  // Commit URL 格式
  commitUrlFormat: 'https://github.com/2ue/ccman/commit/{{hash}}',
  compareUrlFormat: 'https://github.com/2ue/ccman/compare/{{previousTag}}...{{currentTag}}',
  issueUrlFormat: 'https://github.com/2ue/ccman/issues/{{id}}',

  // 类型定义
  types: [
    { type: 'feat', section: '✨ 新功能', hidden: false },
    { type: 'fix', section: '🐛 问题修复', hidden: false },
    { type: 'refactor', section: '♻️ 代码重构', hidden: false },
    { type: 'perf', section: '⚡ 性能优化', hidden: false },
    { type: 'docs', section: '📝 文档更新', hidden: false },
    { type: 'style', section: '💄 代码格式', hidden: true },
    { type: 'test', section: '✅ 测试', hidden: true },
    { type: 'build', section: '📦 构建系统', hidden: true },
    { type: 'ci', section: '👷 CI/CD', hidden: true },
    { type: 'chore', section: '🔧 其他变更', hidden: true },
    { type: 'revert', section: '⏪ 回退', hidden: false },
  ],
})
