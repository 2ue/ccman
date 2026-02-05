codex的mcp
disable_response_storage = true
model = "gpt-5"
model_provider = "gmn"
model_reasoning_effort = "high"

# 注意，这里默认是没有api-key的。如果你需要更多的搜索额度，去context7的网站注册申请一个key即可。
[mcp_servers.context7]
args = ["-y", "@upstash/context7-mcp", "--api-key", "你的key"]
command = "npx"
type = "stdio"

[mcp_servers.ddg-search]
args = ["duckduckgo-mcp-server"]
command = "uvx"
type = "stdio"

[mcp_servers.mcp-deepwiki]
args = ["-y", "mcp-deepwiki@latest"]
command = "npx"
type = "stdio"

[mcp_servers.playwright]
args = ["@playwright/mcp@latest"]
command = "npx"
type = "stdio"

[mcp_servers.sequential-thinking]
args = ["-y", "@modelcontextprotocol/server-sequential-thinking"]
command = "npx"
type = "stdio"

[model_providers.gmn]
base_url = "https://gmn.chuangzuoli.com"
env_key = "OPENAI_API_KEY"
name = "gmn"
requires_openai_auth = true
wire_api = "responses"
