/**
 * 默认供应商配置
 * 预设的常见Claude API供应商
 */

export interface DefaultProvider {
  name: string;
  description: string;
  baseUrl: string;
  category: 'official' | 'third-party';
}

/**
 * 默认供应商列表
 */
export const DEFAULT_PROVIDERS: DefaultProvider[] = [
  {
    name: 'Anthropic Official',
    description: 'Anthropic 官方 API',
    baseUrl: 'https://api.anthropic.com',
    category: 'official'
  },
  {
    name: 'AnyRouter',
    description: 'AnyRouter API 服务',
    baseUrl: 'https://anyrouter.top',
    category: 'third-party'
  },
  {
    name: 'PackyCode',
    description: 'PackyCode API 服务',
    baseUrl: 'https://api.packycode.com',
    category: 'third-party'
  },
  {
    name: 'CoordCode',
    description: 'CoordCode API 服务',
    baseUrl: 'https://api.coordcode.com/api',
    category: 'third-party'
  },
  {
    name: '88Code',
    description: '88Code API 服务',
    baseUrl: 'https://www.88code.org/api',
    category: 'third-party'
  },
  {
    name: 'BigModel',
    description: '智谱 BigModel API',
    baseUrl: 'https://open.bigmodel.cn/api/anthropic',
    category: 'third-party'
  },
  {
    name: 'ModelScope',
    description: '阿里云 ModelScope API',
    baseUrl: 'https://api-inference.modelscope.cn/v1/chat/completions',
    category: 'third-party'
  }
];

/**
 * 根据名称查找默认供应商
 */
export function findDefaultProvider(name: string): DefaultProvider | undefined {
  return DEFAULT_PROVIDERS.find(provider =>
    provider.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * 获取按分类分组的供应商
 */
export function getProvidersByCategory(): {
  official: DefaultProvider[],
  thirdParty: DefaultProvider[]
} {
  return {
    official: DEFAULT_PROVIDERS.filter(p => p.category === 'official'),
    thirdParty: DEFAULT_PROVIDERS.filter(p => p.category === 'third-party')
  };
}

/**
 * 创建供应商选择菜单选项
 */
export function createProviderChoices(): Array<{
  name: string;
  value: DefaultProvider | 'custom' | 'separator';
  short: string;
}> {
  const choices: Array<{
    name: string;
    value: DefaultProvider | 'custom' | 'separator';
    short: string;
  }> = DEFAULT_PROVIDERS.map(provider => ({
    name: `${provider.name} - ${provider.baseUrl}`,
    value: provider,
    short: provider.name
  }));

  // 添加自定义选项
  choices.push({
    name: '🔧 自定义供应商（手动输入）',
    value: 'custom',
    short: '自定义'
  });

  // 添加分割线
  choices.push({
    name: '─'.repeat(50),
    value: 'separator',
    short: '─'
  });

  return choices;
}