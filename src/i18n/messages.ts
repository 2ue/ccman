export interface MessageBundle {
  // 通用消息
  welcome: string;
  error: string;
  success: string;
  cancelled: string;
  
  // 首次运行语言选择
  firstRunWelcome: string;
  firstRunDescription: string;
  chooseLanguage: string;
  languageOptions: {
    chinese: string;
    english: string;
    autoDetect: string;
  };
  languageSetSuccess: string;
  languageChangeHint: string;
  
  // 主菜单
  mainMenuTitle: string;
  mainMenuOptions: {
    switchProvider: string;
    addProvider: string;
    updateProvider: string;
    removeProvider: string;
    showStatus: string;
    doctor: string;
    setup: string;
    exit: string;
  };
  
  // 供应商操作
  noProvidersFound: string;
  createFirstProvider: string;
  providerAdded: string;
  providerSwitched: string;
  providerUpdated: string;
  providerRemoved: string;
  operationCancelled: string;
  
  // 表单字段
  forms: {
    providerId: string;
    providerName: string;
    description: string;
    baseUrl: string;
    apiKey: string;
    selectProvider: string;
    confirmRemove: string;
    continueOperation: string;
  };
  
  // 状态信息
  status: {
    title: string;
    totalProviders: string;
    currentProvider: string;
    claudeConfig: string;
    ccmConfig: string;
    recentProviders: string;
    lastUsed: string;
    usage: string;
  };
  
  // 语言管理
  language: {
    current: string;
    switchSuccess: string;
    resetConfirm: string;
    resetSuccess: string;
    invalidLanguage: string;
    availableCommands: string;
  };

  // 环境管理
  environment: {
    checkTitle: string;
    claudeCode: string;
    nodeJs: string;
    npm: string;
    installed: string;
    notInstalled: string;
    version: string;
    required: string;
    path: string;
    versionManagers: string;
    issues: string;
    suggestions: string;
    ready: string;
    hasWarnings: string;
    notReady: string;
    checkingEnvironment: string;
    environmentStatus: string;
    needsInstallOrUpgrade: string;
    availableOptions: string;
    selectMethod: string;
    selected: string;
    installSteps: string;
    proceedInstall: string;
    dryRunNotice: string;
    installCancelled: string;
    noSetupNeeded: string;
  };

  // 退出消息
  exitMessage: string;
  interruptMessage: string;
}

export const chineseMessages: MessageBundle = {
  // 通用消息
  welcome: '欢迎使用 CCM！',
  error: '错误',
  success: '成功',
  cancelled: '操作已取消',
  
  // 首次运行语言选择
  firstRunWelcome: '🌍 欢迎使用 CCM！/ Welcome to CCM!',
  firstRunDescription: '这是您首次运行 CCM。\nThis is your first time running CCM.',
  chooseLanguage: '请选择您偏好的语言：\nPlease choose your preferred language:',
  languageOptions: {
    chinese: '🇨🇳 中文 (Chinese)',
    english: '🇺🇸 English',
    autoDetect: '🌐 自动检测 (Auto-detect based on system)'
  },
  languageSetSuccess: '语言已设置为中文',
  languageChangeHint: '您可以稍后使用以下命令更改：ccman lang set <zh|en|auto>',
  
  // 主菜单
  mainMenuTitle: '您想要执行什么操作？',
  mainMenuOptions: {
    switchProvider: '切换供应商',
    addProvider: '添加新供应商',
    updateProvider: '更新供应商',
    removeProvider: '删除供应商',
    showStatus: '显示详细状态',
    doctor: '🔍 环境检查',
    setup: '⚙️  环境设置',
    exit: '退出'
  },
  
  // 供应商操作
  noProvidersFound: '未找到供应商配置。让我们创建您的第一个供应商。',
  createFirstProvider: '创建您的第一个供应商',
  providerAdded: '供应商添加成功',
  providerSwitched: '供应商切换成功',
  providerUpdated: '供应商更新成功',
  providerRemoved: '供应商删除成功',
  operationCancelled: '操作已取消',
  
  // 表单字段
  forms: {
    providerId: '供应商ID（唯一标识符）：',
    providerName: '供应商名称：',
    description: '描述：',
    baseUrl: '基础URL：',
    apiKey: 'API密钥：',
    selectProvider: '选择供应商：',
    confirmRemove: '确认删除此供应商吗？',
    continueOperation: '是否要执行其他操作？'
  },
  
  // 状态信息
  status: {
    title: 'CCM 状态：',
    totalProviders: '总供应商数：',
    currentProvider: '当前供应商：',
    claudeConfig: 'Claude配置：',
    ccmConfig: 'CCM配置：',
    recentProviders: '最近使用的供应商：',
    lastUsed: '最后使用',
    usage: '使用次数'
  },
  
  // 语言管理
  language: {
    current: '当前语言：',
    switchSuccess: '语言切换成功',
    resetConfirm: '这将重置语言设置并在下次运行时显示欢迎界面。继续吗？',
    resetSuccess: '语言设置已重置。再次运行 ccman 以选择语言。',
    invalidLanguage: '无效的语言选项。可用选项：zh, en, auto',
    availableCommands: '您可以使用以下命令更改：ccman lang set <zh|en|auto>'
  },

  // 环境管理
  environment: {
    checkTitle: 'Claude Code 环境检查',
    claudeCode: 'Claude Code',
    nodeJs: 'Node.js',
    npm: 'npm',
    installed: '已安装',
    notInstalled: '未安装',
    version: '版本',
    required: '要求',
    path: '路径',
    versionManagers: '版本管理器',
    issues: '问题',
    suggestions: '建议',
    ready: '环境已就绪',
    hasWarnings: '环境有警告',
    notReady: '环境未就绪',
    checkingEnvironment: '检查环境中...',
    environmentStatus: '环境状态',
    needsInstallOrUpgrade: '需要安装或升级',
    availableOptions: '可用的安装选项',
    selectMethod: '选择安装方法',
    selected: '已选择',
    installSteps: '安装步骤',
    proceedInstall: '继续安装吗？(演示模式,不会真正安装)',
    dryRunNotice: '演示模式：不会真正执行安装命令',
    installCancelled: '安装已取消',
    noSetupNeeded: '无需设置。'
  },

  // 退出消息
  exitMessage: '感谢使用 CCM。再见！',
  interruptMessage: '\n\n用户取消操作。再见！'
};

export const englishMessages: MessageBundle = {
  // 通用消息
  welcome: 'Welcome to CCM!',
  error: 'Error',
  success: 'Success',
  cancelled: 'Operation cancelled',
  
  // 首次运行语言选择
  firstRunWelcome: '🌍 Welcome to CCM! / 欢迎使用 CCM！',
  firstRunDescription: 'This is your first time running CCM.\n这是您首次运行 CCM。',
  chooseLanguage: 'Please choose your preferred language:\n请选择您偏好的语言：',
  languageOptions: {
    chinese: '🇨🇳 中文 (Chinese)',
    english: '🇺🇸 English',
    autoDetect: '🌐 Auto-detect based on system (基于系统自动检测)'
  },
  languageSetSuccess: 'Language set to English',
  languageChangeHint: 'You can change this later with: ccman lang set <zh|en|auto>',
  
  // 主菜单
  mainMenuTitle: 'What would you like to do?',
  mainMenuOptions: {
    switchProvider: 'Switch provider',
    addProvider: 'Add new provider',
    updateProvider: 'Update provider',
    removeProvider: 'Remove provider',
    showStatus: 'Show detailed status',
    doctor: '🔍 Environment Check',
    setup: '⚙️  Environment Setup',
    exit: 'Exit'
  },
  
  // 供应商操作
  noProvidersFound: 'No providers found. Let\'s create your first one.',
  createFirstProvider: 'Create your first provider',
  providerAdded: 'Provider added successfully',
  providerSwitched: 'Provider switched successfully',
  providerUpdated: 'Provider updated successfully',
  providerRemoved: 'Provider removed successfully',
  operationCancelled: 'Operation cancelled',
  
  // 表单字段
  forms: {
    providerId: 'Provider ID (unique identifier):',
    providerName: 'Provider name:',
    description: 'Description:',
    baseUrl: 'Base URL:',
    apiKey: 'API Key:',
    selectProvider: 'Select provider:',
    confirmRemove: 'Are you sure you want to remove this provider?',
    continueOperation: 'Would you like to perform another operation?'
  },
  
  // 状态信息
  status: {
    title: 'CCM Status:',
    totalProviders: 'Total providers:',
    currentProvider: 'Current provider:',
    claudeConfig: 'Claude config:',
    ccmConfig: 'CCM config:',
    recentProviders: 'Recent providers:',
    lastUsed: 'Last used',
    usage: 'uses'
  },
  
  // 语言管理
  language: {
    current: 'Current language:',
    switchSuccess: 'Language switched successfully',
    resetConfirm: 'This will reset language setting and show the welcome screen on next run. Continue?',
    resetSuccess: 'Language setting reset. Run ccman again to choose language.',
    invalidLanguage: 'Invalid language option. Available: zh, en, auto',
    availableCommands: 'You can change with: ccman lang set <zh|en|auto>'
  },

  // 环境管理
  environment: {
    checkTitle: 'Claude Code Environment Check',
    claudeCode: 'Claude Code',
    nodeJs: 'Node.js',
    npm: 'npm',
    installed: 'Installed',
    notInstalled: 'Not installed',
    version: 'Version',
    required: 'Required',
    path: 'Path',
    versionManagers: 'Version Managers',
    issues: 'Issues',
    suggestions: 'Suggestions',
    ready: 'Environment is ready',
    hasWarnings: 'Environment has warnings',
    notReady: 'Environment is not ready',
    checkingEnvironment: 'Checking environment...',
    environmentStatus: 'Environment Status',
    needsInstallOrUpgrade: 'needs to be installed or upgraded',
    availableOptions: 'Available installation options',
    selectMethod: 'Select installation method',
    selected: 'Selected',
    installSteps: 'Installation steps',
    proceedInstall: 'Proceed with installation? (dry-run mode, will not actually install)',
    dryRunNotice: 'Dry-run mode: Commands will not be actually executed',
    installCancelled: 'Installation cancelled',
    noSetupNeeded: 'No setup needed.'
  },

  // 退出消息
  exitMessage: 'Thank you for using CCM. Goodbye!',
  interruptMessage: '\n\nOperation cancelled by user. Goodbye!'
};