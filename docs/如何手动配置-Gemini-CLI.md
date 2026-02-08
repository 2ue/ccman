# 如何手动配置 Gemini CLI

## 前言

`ccman` 已经可以自动写入 Gemini CLI 配置（`ccman gm` / `ccman gmn -p gemini`）。
如果你在特殊场景下需要手动配置，可按本文操作。

---

## 配置文件路径

```text
~/.gemini/settings.json
~/.gemini/.env
```

完整模板请参考：

- `packages/core/templates/gemini/settings.json`
- `packages/core/templates/gemini/.env`

---

## 最小可用配置（关键字段）

### 1) settings.json

```json
{
  "ide": { "enabled": true },
  "security": { "auth": { "selectedType": "gemini-api-key" } }
}
```

### 2) .env

```bash
GOOGLE_GEMINI_BASE_URL=https://gmn.chuangzuoli.com
GEMINI_API_KEY=your_api_key_here
```

可选模型字段：

```bash
GEMINI_MODEL=gemini-2.5-pro
```

---

## 与 ccman 的关系

- `ccman` 写入 Gemini 时，会以模板为基准更新关键字段；
- `settings.json` 与 `.env` 的非托管字段会尽量保留；
- 需要统一团队默认配置时，优先维护模板文件而不是反复手改用户目录。
