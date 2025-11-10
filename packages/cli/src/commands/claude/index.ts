import { Command } from 'commander'
import { addCommand } from './add.js'
import { listCommand } from './list.js'
import { useCommand } from './use.js'
import { currentCommand } from './current.js'
import { removeCommand } from './remove.js'
import { editCommand } from './edit.js'
import { cloneCommand } from './clone.js'
import { cleanCommand, cleanAnalyzeCommand } from '../clean.js'

/**
 * 创建 Claude 所有子命令
 */
export function createClaudeCommands(program: Command): void {
  addCommand(program)
  listCommand(program)
  useCommand(program)
  currentCommand(program)
  removeCommand(program)
  editCommand(program)
  cloneCommand(program)
  cleanAnalyzeCommand(program)
  cleanCommand(program)
}
