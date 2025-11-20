import { Command } from 'commander'
import { addCommand } from './add.js'
import { listCommand } from './list.js'
import { useCommand } from './use.js'
import { currentCommand } from './current.js'
import { removeCommand } from './remove.js'
import { editCommand } from './edit.js'
import { cloneCommand } from './clone.js'

/**
 * 创建 Gemini CLI 所有子命令
 */
export function createGeminiCommands(program: Command): void {
  addCommand(program)
  listCommand(program)
  useCommand(program)
  currentCommand(program)
  removeCommand(program)
  editCommand(program)
  cloneCommand(program)
}

