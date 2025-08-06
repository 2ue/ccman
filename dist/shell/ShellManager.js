"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShellManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const constants_1 = require("../config/constants");
class ShellManager {
    constructor() {
        this.homeDir = os.homedir();
        this.ccmanDir = (0, constants_1.getConfigDir)();
        this.ccmanrcPath = (0, constants_1.getShellRCFile)();
    }
    /**
     * 写入环境变量到 CCMan 配置文件并更新 shell 引用
     */
    async writeToShell(envVars, envName) {
        try {
            // 1. 写入环境变量到独立的 ccmanrc 文件
            await this.writeCCMANRC(envVars, envName);
            // 2. 确保 shell 配置文件中有对 ccmanrc 的引用
            const shellUpdateResult = await this.ensureShellReference();
            return {
                success: true,
                filePath: this.ccmanrcPath,
                message: `Environment variables written to ${this.ccmanrcPath}${shellUpdateResult.updated ? ` and shell reference ${shellUpdateResult.action}` : ''}`
            };
        }
        catch (error) {
            return {
                success: false,
                filePath: this.ccmanrcPath,
                message: 'Failed to write environment variables',
                error: String(error)
            };
        }
    }
    /**
     * 写入 ccmanrc 文件
     */
    async writeCCMANRC(envVars, envName) {
        // 确保 .ccman 目录存在
        if (!fs.existsSync(this.ccmanDir)) {
            fs.mkdirSync(this.ccmanDir, { recursive: true });
        }
        const content = this.generateExportStatements(envVars, envName);
        fs.writeFileSync(this.ccmanrcPath, content);
    }
    /**
     * 确保 shell 配置文件中有对 ccmanrc 的引用
     */
    async ensureShellReference() {
        const shellType = this.detectShell();
        const configFiles = this.getShellConfigFiles(shellType);
        // 检查是否已经有引用
        for (const configFile of configFiles) {
            if (fs.existsSync(configFile)) {
                const content = fs.readFileSync(configFile, 'utf8');
                if (this.hasShellReference(content)) {
                    return { updated: false, action: 'already exists' };
                }
            }
        }
        // 添加引用到主配置文件
        const primaryConfigFile = configFiles[0];
        try {
            await this.addShellReference(primaryConfigFile);
            return {
                updated: true,
                action: 'added',
                filePath: primaryConfigFile
            };
        }
        catch (error) {
            // 尝试其他配置文件
            for (let i = 1; i < configFiles.length; i++) {
                try {
                    await this.addShellReference(configFiles[i]);
                    return {
                        updated: true,
                        action: 'added (fallback)',
                        filePath: configFiles[i]
                    };
                }
                catch (fallbackError) {
                    continue;
                }
            }
            throw new Error('Failed to add shell reference to any configuration file');
        }
    }
    /**
     * 添加 shell 引用到配置文件
     */
    async addShellReference(configFilePath) {
        // 确保目录存在
        const dir = path.dirname(configFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        let content = '';
        if (fs.existsSync(configFilePath)) {
            content = fs.readFileSync(configFilePath, 'utf8');
        }
        // 添加对 ccmanrc 的引用
        const reference = this.generateShellReference();
        content += reference;
        fs.writeFileSync(configFilePath, content);
    }
    /**
     * 生成 shell 引用代码
     */
    generateShellReference() {
        return `
# ${constants_1.CONFIG.APP_FULL_NAME} - Auto Generated Reference
# This line sources ${constants_1.CONFIG.APP_NAME} environment variables from ${this.ccmanrcPath}
[ -f "${this.ccmanrcPath}" ] && source "${this.ccmanrcPath}"
# End ${constants_1.CONFIG.APP_NAME} Reference
`;
    }
    /**
     * 检查是否已经有 shell 引用
     */
    hasShellReference(content) {
        return content.includes(`# ${constants_1.CONFIG.APP_FULL_NAME} - Auto Generated Reference`) ||
            content.includes(this.ccmanrcPath);
    }
    /**
     * 从 shell 配置文件中清除 ccmanrc 引用和 ccmanrc 文件
     */
    async clearFromShell() {
        let clearedAny = false;
        let lastError;
        // 1. 删除 ccmanrc 文件
        if (fs.existsSync(this.ccmanrcPath)) {
            try {
                fs.unlinkSync(this.ccmanrcPath);
                clearedAny = true;
            }
            catch (error) {
                lastError = String(error);
            }
        }
        // 2. 从 shell 配置文件中移除引用
        const shellType = this.detectShell();
        const configFiles = this.getShellConfigFiles(shellType);
        for (const configFile of configFiles) {
            try {
                if (fs.existsSync(configFile)) {
                    await this.removeShellReference(configFile);
                    clearedAny = true;
                }
            }
            catch (error) {
                lastError = String(error);
            }
        }
        if (clearedAny) {
            return {
                success: true,
                filePath: this.ccmanrcPath,
                message: 'Environment variables and shell references cleared'
            };
        }
        else {
            return {
                success: false,
                filePath: this.ccmanrcPath,
                message: 'Failed to clear environment variables',
                error: lastError
            };
        }
    }
    /**
     * 从配置文件中移除 shell 引用
     */
    async removeShellReference(filePath) {
        if (!fs.existsSync(filePath)) {
            return;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        const cleanedContent = this.removeShellReferenceFromContent(content);
        fs.writeFileSync(filePath, cleanedContent);
    }
    /**
     * 从内容中移除 shell 引用部分
     */
    removeShellReferenceFromContent(content) {
        const startMarker = `# ${constants_1.CONFIG.APP_FULL_NAME} - Auto Generated Reference`;
        const endMarker = `# End ${constants_1.CONFIG.APP_NAME} Reference`;
        const lines = content.split('\n');
        const filteredLines = [];
        let inCCMSection = false;
        for (const line of lines) {
            if (line.includes(startMarker)) {
                inCCMSection = true;
                continue;
            }
            if (line.includes(endMarker)) {
                inCCMSection = false;
                continue;
            }
            if (!inCCMSection) {
                filteredLines.push(line);
            }
        }
        return filteredLines.join('\n').replace(/\n{3,}/g, '\n\n');
    }
    /**
     * 检测当前使用的 shell 类型
     */
    detectShell() {
        const shell = process.env.SHELL || '';
        if (shell.includes('zsh')) {
            return 'zsh';
        }
        else if (shell.includes('bash')) {
            return 'bash';
        }
        else if (shell.includes('fish')) {
            return 'fish';
        }
        else {
            return 'unknown';
        }
    }
    /**
     * 获取 shell 配置文件路径列表
     */
    getShellConfigFiles(shellType) {
        const configFiles = [];
        switch (shellType) {
            case 'zsh':
                configFiles.push(path.join(this.homeDir, '.zshrc'), path.join(this.homeDir, '.zprofile'));
                break;
            case 'bash':
                configFiles.push(path.join(this.homeDir, '.bashrc'), path.join(this.homeDir, '.bash_profile'), path.join(this.homeDir, '.profile'));
                break;
            case 'fish':
                configFiles.push(path.join(this.homeDir, '.config/fish/config.fish'));
                break;
            default:
                // 默认尝试常见的配置文件
                configFiles.push(path.join(this.homeDir, '.zshrc'), path.join(this.homeDir, '.bashrc'), path.join(this.homeDir, '.profile'));
        }
        return configFiles;
    }
    /**
     * 生成环境变量导出语句
     */
    generateExportStatements(envVars, envName) {
        const now = new Date();
        const timestamp = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + ' ' +
            String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0') + ':' +
            String(now.getSeconds()).padStart(2, '0');
        const nameComment = envName ? `# Environment: ${envName}` : '';
        return `
# ${constants_1.CONFIG.APP_FULL_NAME} Environment Variables - Auto Generated
# Generated at: ${timestamp}${nameComment ? '\n' + nameComment : ''}
export ${constants_1.CONFIG.ENV_VARS.BASE_URL}="${envVars.ANTHROPIC_BASE_URL}"
export ${constants_1.CONFIG.ENV_VARS.AUTH_TOKEN}="${envVars.ANTHROPIC_AUTH_TOKEN}"
# End ${constants_1.CONFIG.APP_NAME} Environment Variables
`;
    }
    /**
     * 检查是否已经写入了环境变量
     */
    hasEnvVarsInShell() {
        // 检查 ccmanrc 文件是否存在
        if (fs.existsSync(this.ccmanrcPath)) {
            return true;
        }
        // 检查 shell 配置文件中是否有引用
        const shellType = this.detectShell();
        const configFiles = this.getShellConfigFiles(shellType);
        for (const configFile of configFiles) {
            if (fs.existsSync(configFile)) {
                const content = fs.readFileSync(configFile, 'utf8');
                if (this.hasShellReference(content)) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * 自动 source shell 配置文件
     */
    async autoSourceShell() {
        const shellType = this.detectShell();
        const configFiles = this.getShellConfigFiles(shellType);
        // 找到第一个存在的配置文件
        const activeConfigFile = configFiles.find(file => fs.existsSync(file));
        if (!activeConfigFile) {
            return {
                success: false,
                filePath: configFiles.join(', '),
                message: 'No shell configuration file found to source',
                error: 'Configuration file not found'
            };
        }
        try {
            // 使用子进程执行 source 命令
            const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
            const { promisify } = await Promise.resolve().then(() => __importStar(require('util')));
            const execAsync = promisify(exec);
            // 根据不同 shell 类型使用不同的 source 命令
            let sourceCommand;
            switch (shellType) {
                case 'zsh':
                    sourceCommand = `zsh -c "source ${activeConfigFile}"`;
                    break;
                case 'bash':
                    sourceCommand = `bash -c "source ${activeConfigFile}"`;
                    break;
                case 'fish':
                    sourceCommand = `fish -c "source ${activeConfigFile}"`;
                    break;
                default:
                    sourceCommand = `bash -c "source ${activeConfigFile}"`;
            }
            await execAsync(sourceCommand);
            return {
                success: true,
                filePath: activeConfigFile,
                message: `Successfully sourced ${activeConfigFile}`
            };
        }
        catch (error) {
            return {
                success: false,
                filePath: activeConfigFile,
                message: 'Failed to source shell configuration file',
                error: String(error)
            };
        }
    }
    /**
     * 获取当前 shell 信息
     */
    getShellInfo() {
        const shellType = this.detectShell();
        const configFiles = this.getShellConfigFiles(shellType);
        // 找到第一个存在的配置文件作为活动配置文件
        const activeConfigFile = configFiles.find(file => fs.existsSync(file));
        return {
            shellType,
            shellPath: process.env.SHELL || 'unknown',
            configFiles,
            activeConfigFile
        };
    }
}
exports.ShellManager = ShellManager;
//# sourceMappingURL=ShellManager.js.map