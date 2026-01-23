import { Command } from 'commander'
import { addCommand } from './add.js'
import { listCommand } from './list.js'
import { useCommand } from './use.js'
import { currentCommand } from './current.js'
import { editCommand } from './edit.js'
import { removeCommand } from './remove.js'
import { cloneCommand } from './clone.js'

/**
 * 创建 OpenCode 所有子命令
 */
export function createOpenCodeCommands(program: Command): void {
  addCommand(program)
  listCommand(program)
  useCommand(program)
  currentCommand(program)
  editCommand(program)
  removeCommand(program)
  cloneCommand(program)
}
