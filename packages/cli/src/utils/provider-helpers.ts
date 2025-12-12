/**
 * Provider command helpers - Unified provider management utilities
 *
 * This module provides helper functions for CLI commands to interact with
 * the new ProviderService while maintaining the same user experience.
 */

import chalk from 'chalk'
import inquirer from 'inquirer'
import { ProviderService, ToolRegistry, type Tool, type Provider } from '@ccman/core'

/**
 * Get all providers for a tool
 */
export function getProviders(tool: Tool): Provider[] {
  return ProviderService.list(tool)
}

/**
 * Get current provider for a tool
 */
export function getCurrentProvider(tool: Tool): Provider | null {
  return ProviderService.current(tool)
}

/**
 * Add a provider
 */
export function addProvider(
  tool: Tool,
  input: {
    name: string
    baseUrl?: string
    apiKey?: string
    model?: string
    desc?: string
  }
): Provider {
  return ProviderService.add(tool, input)
}

/**
 * Update a provider
 */
export function updateProvider(
  tool: Tool,
  name: string,
  updates: Partial<{
    name: string
    baseUrl?: string
    apiKey?: string
    model?: string
    desc?: string
  }>
): Provider {
  return ProviderService.update(tool, name, updates)
}

/**
 * Delete a provider
 */
export function deleteProvider(tool: Tool, name: string): void {
  ProviderService.delete(tool, name)
}

/**
 * Apply (switch to) a provider
 */
export function applyProvider(tool: Tool, name: string): void {
  ProviderService.apply(tool, name)
}

/**
 * Clone a provider
 */
export function cloneProvider(
  tool: Tool,
  sourceName: string,
  newName: string,
  overrides?: Partial<{
    apiKey?: string
    baseUrl?: string
    model?: string
    desc?: string
  }>
): Provider {
  return ProviderService.clone(tool, sourceName, newName, overrides)
}

/**
 * Get presets for a tool
 */
export function getPresets(tool: Tool) {
  const descriptor = ToolRegistry.get(tool)
  return descriptor.presets || []
}

/**
 * Interactive: Select a provider from list
 */
export async function selectProvider(tool: Tool, message: string): Promise<Provider | null> {
  const providers = getProviders(tool)

  if (providers.length === 0) {
    console.log(chalk.yellow('\n⚠️  暂无服务商\n'))
    return null
  }

  const { providerName } = await inquirer.prompt([
    {
      type: 'list',
      name: 'providerName',
      message,
      choices: providers.map((p) => ({
        name: `${p.name} ${p.baseUrl ? chalk.gray(`(${p.baseUrl})`) : ''}`,
        value: p.name,
      })),
    },
  ])

  return ProviderService.get(tool, providerName)
}

/**
 * Interactive: Confirm action
 */
export async function confirmAction(message: string, defaultValue = false): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue,
    },
  ])
  return confirmed
}

/**
 * Display tool-specific config file path
 */
export function getConfigPath(tool: Tool): string {
  const descriptor = ToolRegistry.get(tool)
  // Return first config path (main)
  return descriptor.configPaths[0]?.path || '~/.ccman'
}
