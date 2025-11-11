import { Command } from 'commander'
import { addCommand } from './add.js'
import { listCommand } from './list.js'
import { removeCommand } from './remove.js'
import { editCommand } from './edit.js'

/**
 * 创建 MCP 管理命令
 */
export function createMCPCommands(program: Command): void {
  addCommand(program)
  listCommand(program)
  removeCommand(program)
  editCommand(program)
}
