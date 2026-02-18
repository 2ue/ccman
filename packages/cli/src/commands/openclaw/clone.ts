import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createOpenClawManager, ProviderNotFoundError } from '@ccman/core'
import { promptProviderForm } from '../../interactive.js'

export function cloneCommand(program: Command): void {
  program
    .command('clone [source-name] [new-name]')
    .description('克隆 OpenClaw 服务商')
    .action(async (sourceName?: string, newName?: string) => {
      try {
        const manager = createOpenClawManager()
        const providers = manager.list()

        if (providers.length === 0) {
          console.log(chalk.yellow('\n⚠️  暂无 OpenClaw 服务商\n'))
          return
        }

        let sourceId: string

        if (sourceName) {
          const provider = manager.findByName(sourceName)
          if (!provider) {
            throw new ProviderNotFoundError(sourceName)
          }
          sourceId = provider.id
        } else {
          const { selectedId } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedId',
              message: '选择要克隆的服务商:',
              choices: providers.map((p) => ({
                name: `${p.name} - ${p.baseUrl}`,
                value: p.id,
              })),
            },
          ])
          sourceId = selectedId
        }

        const source = manager.get(sourceId)

        let cloned

        if (newName) {
          cloned = manager.clone(sourceId, newName)
        } else {
          console.log(chalk.blue(`\n克隆自: ${source.name}\n`))

          const input = await promptProviderForm({
            name: `${source.name}（副本）`,
            desc: '',
            baseUrl: source.baseUrl,
            apiKey: source.apiKey,
          })

          cloned = manager.add({
            name: input.name,
            desc: input.desc,
            baseUrl: input.baseUrl,
            apiKey: input.apiKey,
          })
        }

        console.log()
        console.log(chalk.green('✅ 克隆成功'))
        console.log()
        console.log(`  ${chalk.bold(cloned.name)} ${chalk.blue('[OpenClaw]')}`)
        console.log(`  ${chalk.gray(`ID: ${cloned.id}`)}`)
        console.log(`  ${chalk.gray(`URL: ${cloned.baseUrl}`)}`)
        console.log()
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}
