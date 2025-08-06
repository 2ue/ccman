import { ShellManager } from '../shell/ShellManager';
import { ClaudeEnv, AddEnvOptions, EnvironmentListItem } from '../types';
export declare class EnvironmentManager {
    private configManager;
    private shellManager;
    constructor();
    /**
     * 添加环境变量组
     */
    addEnvironment(options: AddEnvOptions): Promise<ClaudeEnv>;
    /**
     * 删除环境变量组
     */
    removeEnvironment(name: string): Promise<void>;
    /**
     * 设置使用的环境变量组
     */
    useEnvironment(name: string, options?: {
        autoWriteShell?: boolean;
        autoSource?: boolean;
    }): Promise<{
        env: ClaudeEnv;
        shellWriteResult?: any;
        sourceResult?: any;
    }>;
    /**
     * 获取所有环境变量组
     */
    listEnvironments(): EnvironmentListItem[];
    /**
     * 获取当前使用的环境变量组
     */
    getCurrentEnvironment(): ClaudeEnv | null;
    /**
     * 获取指定环境
     */
    getEnvironment(name: string): ClaudeEnv | null;
    /**
     * 更新环境
     */
    updateEnvironment(name: string, updates: {
        baseUrl?: string;
        apiKey?: string;
    }, autoWriteShell?: boolean): Promise<ClaudeEnv>;
    /**
     * 生成环境变量脚本
     */
    generateEnvScript(): string;
    /**
     * 测试环境连接
     */
    testEnvironment(name?: string): Promise<{
        success: boolean;
        message: string;
        error?: string;
    }>;
    /**
     * 获取环境统计信息
     */
    getStats(): {
        totalEnvironments: number;
        currentEnvironment: string | null;
        hasShellIntegration: boolean;
    };
    /**
     * 将 ClaudeEnv 转换为 shell 环境变量格式
     */
    private getEnvVars;
    /**
     * 获取 Shell Manager 实例（用于高级操作）
     */
    getShellManager(): ShellManager;
    /**
     * 清除所有环境和配置
     */
    clearAll(): Promise<{
        success: boolean;
        message: string;
        details: string[];
    }>;
    private validateEnvironmentInput;
}
//# sourceMappingURL=EnvironmentManager.d.ts.map