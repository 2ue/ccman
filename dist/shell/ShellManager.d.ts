import { ShellEnvVars, ShellWriteResult, ShellType } from '../types';
export declare class ShellManager {
    private readonly homeDir;
    private readonly ccmanDir;
    private readonly ccmanrcPath;
    constructor();
    /**
     * 写入环境变量到 CCMan 配置文件并更新 shell 引用
     */
    writeToShell(envVars: ShellEnvVars, envName?: string): Promise<ShellWriteResult>;
    /**
     * 写入 ccmanrc 文件
     */
    private writeCCMANRC;
    /**
     * 确保 shell 配置文件中有对 ccmanrc 的引用
     */
    private ensureShellReference;
    /**
     * 添加 shell 引用到配置文件
     */
    private addShellReference;
    /**
     * 生成 shell 引用代码
     */
    private generateShellReference;
    /**
     * 检查是否已经有 shell 引用
     */
    private hasShellReference;
    /**
     * 从 shell 配置文件中清除 ccmanrc 引用和 ccmanrc 文件
     */
    clearFromShell(): Promise<ShellWriteResult>;
    /**
     * 从配置文件中移除 shell 引用
     */
    private removeShellReference;
    /**
     * 从内容中移除 shell 引用部分
     */
    private removeShellReferenceFromContent;
    /**
     * 检测当前使用的 shell 类型
     */
    detectShell(): ShellType;
    /**
     * 获取 shell 配置文件路径列表
     */
    getShellConfigFiles(shellType: ShellType): string[];
    /**
     * 生成环境变量导出语句
     */
    generateExportStatements(envVars: ShellEnvVars, envName?: string): string;
    /**
     * 检查是否已经写入了环境变量
     */
    hasEnvVarsInShell(): boolean;
    /**
     * 自动 source shell 配置文件
     */
    autoSourceShell(): Promise<ShellWriteResult>;
    /**
     * 获取当前 shell 信息
     */
    getShellInfo(): {
        shellType: ShellType;
        shellPath: string;
        configFiles: string[];
        activeConfigFile?: string;
    };
}
//# sourceMappingURL=ShellManager.d.ts.map