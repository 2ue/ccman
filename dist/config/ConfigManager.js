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
exports.ConfigManager = void 0;
const fs = __importStar(require("fs"));
const constants_1 = require("./constants");
class ConfigManager {
    constructor() {
        this.configDir = (0, constants_1.getConfigDir)();
        this.configFile = (0, constants_1.getConfigFile)();
        this.ensureConfigDir();
    }
    /**
     * 确保配置目录存在
     */
    ensureConfigDir() {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
    }
    /**
     * 获取配置
     */
    getConfig() {
        if (!fs.existsSync(this.configFile)) {
            const defaultConfig = {
                current: null,
                environments: {},
                settings: {
                    autoWriteShell: true,
                    preferredShell: 'auto'
                }
            };
            this.saveConfig(defaultConfig);
            return defaultConfig;
        }
        try {
            const content = fs.readFileSync(this.configFile, 'utf8');
            return JSON.parse(content);
        }
        catch (error) {
            throw new Error(`Failed to read config: ${error}`);
        }
    }
    /**
     * 保存配置
     */
    saveConfig(config) {
        try {
            fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
        }
        catch (error) {
            throw new Error(`Failed to save config: ${error}`);
        }
    }
    /**
     * 添加环境
     */
    addEnvironment(options) {
        const config = this.getConfig();
        if (config.environments[options.name]) {
            throw new Error(`Environment "${options.name}" already exists`);
        }
        const newEnv = {
            name: options.name,
            baseUrl: options.baseUrl,
            apiKey: options.apiKey,
            createdAt: new Date().toISOString()
        };
        config.environments[options.name] = newEnv;
        // 如果是第一个环境，设为当前环境
        if (!config.current) {
            config.current = options.name;
        }
        this.saveConfig(config);
        return newEnv;
    }
    /**
     * 删除环境
     */
    removeEnvironment(name) {
        const config = this.getConfig();
        if (!config.environments[name]) {
            throw new Error(`Environment "${name}" not found`);
        }
        delete config.environments[name];
        // 如果删除的是当前环境，清空当前环境或切换到第一个可用环境
        if (config.current === name) {
            const remainingEnvs = Object.keys(config.environments);
            config.current = remainingEnvs.length > 0 ? remainingEnvs[0] : null;
        }
        this.saveConfig(config);
    }
    /**
     * 设置当前环境
     */
    setCurrentEnvironment(name) {
        const config = this.getConfig();
        if (!config.environments[name]) {
            throw new Error(`Environment "${name}" not found`);
        }
        config.current = name;
        config.environments[name].lastUsed = new Date().toISOString();
        this.saveConfig(config);
        return config.environments[name];
    }
    /**
     * 获取当前环境
     */
    getCurrentEnvironment() {
        const config = this.getConfig();
        if (!config.current || !config.environments[config.current]) {
            return null;
        }
        return config.environments[config.current];
    }
    /**
     * 获取所有环境列表
     */
    listEnvironments() {
        const config = this.getConfig();
        return Object.values(config.environments).map(env => ({
            ...env,
            isCurrent: env.name === config.current
        }));
    }
    /**
     * 获取指定环境
     */
    getEnvironment(name) {
        const config = this.getConfig();
        return config.environments[name] || null;
    }
    /**
     * 更新环境
     */
    updateEnvironment(name, updates) {
        const config = this.getConfig();
        if (!config.environments[name]) {
            throw new Error(`Environment "${name}" not found`);
        }
        config.environments[name] = {
            ...config.environments[name],
            ...updates
        };
        this.saveConfig(config);
        return config.environments[name];
    }
    /**
     * 更新全局设置
     */
    updateSettings(settings) {
        const config = this.getConfig();
        config.settings = {
            ...config.settings,
            ...settings
        };
        this.saveConfig(config);
        return config.settings;
    }
    /**
     * 获取全局设置
     */
    getSettings() {
        return this.getConfig().settings;
    }
    /**
     * 检查环境是否存在
     */
    hasEnvironment(name) {
        const config = this.getConfig();
        return !!config.environments[name];
    }
    /**
     * 获取环境数量
     */
    getEnvironmentCount() {
        const config = this.getConfig();
        return Object.keys(config.environments).length;
    }
    /**
     * 清除所有环境和重置配置
     */
    clearAll() {
        const config = this.getConfig();
        // 重置配置到初始状态
        config.current = null;
        config.environments = {};
        // 保存重置后的配置
        this.saveConfig(config);
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=ConfigManager.js.map