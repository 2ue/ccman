import { Config, ClaudeEnv, GlobalSettings, AddEnvOptions, EnvironmentListItem } from '../types';
export declare class ConfigManager {
    private readonly configDir;
    private readonly configFile;
    constructor();
    /**
     * 确保配置目录存在
     */
    private ensureConfigDir;
    /**
     * 获取配置
     */
    getConfig(): Config;
    /**
     * 保存配置
     */
    saveConfig(config: Config): void;
    /**
     * 添加环境
     */
    addEnvironment(options: AddEnvOptions): ClaudeEnv;
    /**
     * 删除环境
     */
    removeEnvironment(name: string): void;
    /**
     * 设置当前环境
     */
    setCurrentEnvironment(name: string): ClaudeEnv;
    /**
     * 获取当前环境
     */
    getCurrentEnvironment(): ClaudeEnv | null;
    /**
     * 获取所有环境列表
     */
    listEnvironments(): EnvironmentListItem[];
    /**
     * 获取指定环境
     */
    getEnvironment(name: string): ClaudeEnv | null;
    /**
     * 更新环境
     */
    updateEnvironment(name: string, updates: Partial<Omit<ClaudeEnv, 'name' | 'createdAt'>>): ClaudeEnv;
    /**
     * 更新全局设置
     */
    updateSettings(settings: Partial<GlobalSettings>): GlobalSettings;
    /**
     * 获取全局设置
     */
    getSettings(): GlobalSettings;
    /**
     * 检查环境是否存在
     */
    hasEnvironment(name: string): boolean;
    /**
     * 获取环境数量
     */
    getEnvironmentCount(): number;
    /**
     * 清除所有环境和重置配置
     */
    clearAll(): void;
}
//# sourceMappingURL=ConfigManager.d.ts.map