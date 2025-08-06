/**
 * Claude Code Manager 类型定义
 */
export interface ClaudeEnv {
    /** 环境名称 */
    name: string;
    /** API 基础 URL */
    baseUrl: string;
    /** API 密钥 */
    apiKey: string;
    /** 创建时间 */
    createdAt: string;
    /** 最后使用时间 */
    lastUsed?: string;
}
export interface Config {
    /** 当前使用的环境名称 */
    current: string | null;
    /** 环境配置列表 */
    environments: {
        [name: string]: ClaudeEnv;
    };
    /** 全局设置 */
    settings: GlobalSettings;
}
export interface GlobalSettings {
    /** 是否自动写入 shell 配置文件 */
    autoWriteShell: boolean;
    /** 首选的 shell 类型 */
    preferredShell: 'bash' | 'zsh' | 'auto';
    /** shell 配置文件路径（可自定义） */
    shellConfigPath?: string;
}
export interface ShellEnvVars {
    ANTHROPIC_BASE_URL: string;
    ANTHROPIC_AUTH_TOKEN: string;
}
export interface AddEnvOptions {
    name: string;
    baseUrl: string;
    apiKey: string;
    autoWriteShell?: boolean;
}
export interface ShellWriteResult {
    success: boolean;
    filePath: string;
    message: string;
    error?: string;
}
export interface EnvironmentListItem extends ClaudeEnv {
    /** 是否为当前使用的环境 */
    isCurrent: boolean;
}
export type ShellType = 'bash' | 'zsh' | 'fish' | 'unknown';
//# sourceMappingURL=index.d.ts.map