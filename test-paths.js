// 测试开发环境路径
process.env.NODE_ENV = 'development'

// 动态导入已编译的 paths 模块
import('./packages/core/dist/paths.js').then((paths) => {
  console.log('=== 开发环境路径 ===')
  console.log('ccman:', paths.getCcmanDir())
  console.log('codex:', paths.getCodexDir())
  console.log('claude:', paths.getClaudeDir())
  console.log('')
  console.log('✅ 开发环境使用临时目录，不会影响正式环境')
  console.log('✅ 正式环境路径在: ~/.ccman, ~/.codex, ~/.claude')
}).catch(err => {
  console.error('Error:', err.message)
  console.log('请先运行: pnpm build')
})
