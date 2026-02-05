---
原文链接: https://developers.openai.com/codex/local-config#cli
保存时间: 2025-11-19 13:35:00
---

# Configuring Codex

Codex should work out of the box for most users. But sometimes you want to configure Codex to your own liking to better suit your needs. For this there is a wide range of configuration options.

The configuration file for Codex is located at `~/.codex/config.toml`.

To access the configuration file when you are using the Codex IDE extension, you can click the gear icon in the top right corner of the extension and then clicking `Codex Settings > Open config.toml`.

This configuration file is shared between the CLI and the IDE extension and can be used to configure things like the default model, [approval policies, sandbox settings](https://developers.openai.com/codex/security) or [MCP servers](https://developers.openai.com/codex/mcp) that Codex should have access to.

Codex provides a wide range of configuration options. Some of the most commonly changed settings are:

#### Default model

Pick which model Codex uses by default in both the CLI and IDE.

**Using `config.toml`:**

```
model = "gpt-5"
```

**Using CLI arguments:**

```
codex --model gpt-5
```

#### Model provider

Select the backend provider referenced by the active model. Be sure to [define the provider](https://github.com/openai/codex/blob/main/docs/config.md#model_providers) in your config first.

**Using `config.toml`:**

```
model_provider = "ollama"
```

**Using CLI arguments:**

```
codex --config model_provider="ollama"
```

#### Approval prompts

Control when Codex pauses to ask before running generated commands.

**Using `config.toml`:**

```
approval_policy = "on-request"
```

**Using CLI arguments:**

```
codex --ask-for-approval on-request
```

#### Sandbox level

Adjust how much filesystem and network access Codex has while executing commands.

**Using `config.toml`:**

```
sandbox_mode = "workspace-write"
```

**Using CLI arguments:**

```
codex --sandbox workspace-write
```

#### Reasoning depth

Tune how much reasoning effort the model applies when supported.

**Using `config.toml`:**

```
model_reasoning_effort = "high"
```

**Using CLI arguments:**

```
codex --config model_reasoning_effort="high"
```

#### Command environment

Restrict or expand which environment variables are forwarded to spawned commands.

**Using `config.toml`:**

```
[shell_environment_policy]
include_only = ["PATH", "HOME"]
```

**Using CLI arguments:**

```
codex --config shell_environment_policy.include_only='["PATH","HOME"]'
```

Profiles bundle a set of configuration values so you can jump between setups without editing `config.toml` each time. They currently apply to the Codex CLI.

Define profiles under `[profiles.<name>]` in `config.toml` and launch the CLI with `codex --profile <name>`:

```
model = "gpt-5-codex"
approval_policy = "on-request"

[profiles.deep-review]
model = "gpt-5-pro"
model_reasoning_effort = "high"
approval_policy = "never"

[profiles.lightweight]
model = "gpt-4.1"
approval_policy = "untrusted"
```

Running `codex --profile deep-review` will use the `gpt-5-pro` model with high reasoning effort and no approval policy. Running `codex --profile lightweight` will use the `gpt-4.1` model with untrusted approval policy. To make one profile the default, add `profile = "deep-review"` at the top level of `config.toml`; the CLI will load that profile unless you override it on the command line.

Values resolve in this order: explicit CLI flags (like `--model`) override everything, profile values come next, then root-level entries in `config.toml`, and finally the CLI's built-in defaults. Use that precedence to layer common settings at the top level while letting each profile tweak just the fields that need to change.

Optional and experimental capabilities are toggled via the `[features]` table in `config.toml`. If Codex emits a deprecation warning mentioning a legacy key (such as `experimental_use_exec_command_tool`), move that setting into `[features]` or launch the CLI with `codex --enable <feature>`.

```
web_search = "live"              # "live" | "cached" | "disabled"

[features]
streamable_shell = true          # enable the streamable exec tool
# view_image_tool defaults to true; omit to keep defaults
```

### Supported features

| Key | Default | Stage | Description |
| --- | --- | --- | --- |
| `unified_exec` | false | Experimental | Use the unified PTY-backed exec tool |
| `streamable_shell` | false | Experimental | Use the streamable exec-command/write-stdin pair |
| `rmcp_client` | false | Experimental | Enable OAuth support for streamable HTTP MCP servers |
| `apply_patch_freeform` | false | Beta | Include the freeform `apply_patch` tool |
| `view_image_tool` | true | Stable | Include the `view_image` tool |
| `web_search_request` | false | Deprecated | Deprecated; set `web_search = "live"` (or `"cached"` / `"disabled"`) instead |
| `experimental_sandbox_command_assessment` | false | Experimental | Enable model-based sandbox risk assessment |
| `ghost_commit` | false | Experimental | Create a ghost commit each turn |
| `enable_experimental_windows_sandbox` | false | Experimental | Use the Windows restricted-token sandbox |

Omit feature keys to keep their defaults.
Legacy booleans such as `experimental_use_exec_command_tool`, `experimental_use_unified_exec_tool`, `include_apply_patch_tool`, and similar `experimental_use_*` entries are deprecated—migrate them to the matching `[features].<key>` flag to avoid repeated warnings.

### Enabling features quickly

*   In `config.toml`: add `feature_name = true` under `[features]`.
*   CLI onetime: `codex --enable feature_name`.
*   Multiple flags: `codex --enable feature_a --enable feature_b`.
*   Disable explicitly by setting the key to `false` in `config.toml`.

### Custom model providers

Define additional providers and point `model_provider` at them:

```
model = "gpt-4o"
model_provider = "openai-chat-completions"

[model_providers.openai-chat-completions]
name = "OpenAI using Chat Completions"
base_url = "https://api.openai.com/v1"
env_key = "OPENAI_API_KEY"
wire_api = "chat"
query_params = {}

[model_providers.ollama]
name = "Ollama"
base_url = "http://localhost:11434/v1"

[model_providers.mistral]
name = "Mistral"
base_url = "https://api.mistral.ai/v1"
env_key = "MISTRAL_API_KEY"
```

Add request headers when needed:

```
[model_providers.example]
http_headers = { "X-Example-Header" = "example-value" }
env_http_headers = { "X-Example-Features" = "EXAMPLE_FEATURES" }
```

### Azure provider & per-provider tuning

```
[model_providers.azure]
name = "Azure"
base_url = "https://YOUR_PROJECT_NAME.openai.azure.com/openai"
env_key = "AZURE_OPENAI_API_KEY"
query_params = { api-version = "2025-04-01-preview" }
wire_api = "responses"

[model_providers.openai]
request_max_retries = 4
stream_max_retries = 10
stream_idle_timeout_ms = 300000
```

### Model reasoning, verbosity, and limits

```
model_reasoning_summary = "none"          # disable summaries
model_verbosity = "low"                   # shorten responses on Responses API providers
model_supports_reasoning_summaries = true # force reasoning on custom providers
model_context_window = 128000             # override when Codex doesn't know the window
model_max_output_tokens = 4096            # cap completion length
```

`model_verbosity` applies only to providers using the Responses API; Chat Completions providers will ignore the setting.

### Approval policies and sandbox modes

Pick approval strictness (affects when Codex pauses) and sandbox level (affects file/network access). See [Sandbox & approvals](https://developers.openai.com/codex/security) for deeper examples.

```
approval_policy = "untrusted"   # other options: on-request, on-failure, never
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
exclude_tmpdir_env_var = false  # allow $TMPDIR
exclude_slash_tmp = false       # allow /tmp
writable_roots = ["/Users/YOU/.pyenv/shims"]
network_access = false          # opt in to outbound network
```

Disable sandboxing entirely (use only if your environment already isolates processes):

```
sandbox_mode = "danger-full-access"
```

### Shell environment templates

`shell_environment_policy` controls which environment variables Codex passes to any subprocess it launches (for example, when running a tool-command the model proposes). Start from a clean slate (`inherit = "none"`) or a trimmed set (`inherit = "core"`), then layer on excludes, includes, and overrides to avoid leaking secrets while still providing the paths, keys, or flags your tasks need.

```
[shell_environment_policy]
inherit = "none"
set = { PATH = "/usr/bin", MY_FLAG = "1" }
ignore_default_excludes = false
exclude = ["AWS_*", "AZURE_*"]
include_only = ["PATH", "HOME"]
```

Patterns are case-insensitive globs (`*`, `?`, `[A-Z]`); `ignore_default_excludes = false` keeps the automatic KEY/SECRET/TOKEN filter before your includes/excludes run.

### MCP servers

See the dedicated [MCP guide](https://developers.openai.com/codex/mcp) for full server setups and toggle descriptions. Below is a minimal STDIO example using the Context7 MCP server:

```
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
```

### Observibility and telemetry

Enable OpenTelemetry (Otel) log export to track Codex runs (API requests, SSE/events, prompts, tool approvals/results). Disabled by default; opt in via `[otel]`:

```
[otel]
environment = "staging"   # defaults to "dev"
exporter = "none"         # set to otlp-http or otlp-grpc to send events
log_user_prompt = false   # redact user prompts unless explicitly enabled
```

Choose an exporter:

```
[otel]
exporter = { otlp-http = {
  endpoint = "https://otel.example.com/v1/logs",
  protocol = "binary",
  headers = { "x-otlp-api-key" = "${OTLP_TOKEN}" }
}}
```

```
[otel]
exporter = { otlp-grpc = {
  endpoint = "https://otel.example.com:4317",
  headers = { "x-otlp-meta" = "abc123" }
}}
```

If `exporter = "none"` Codex records events but sends nothing. Exporters batch asynchronously and flush on shutdown. Event metadata includes service name, CLI version, env tag, conversation id, model, sandbox/approval settings, and per-event fields (see Config reference table below).

### Notifications

Use `notify` to trigger an external program whenever Codex emits supported events (today: `agent-turn-complete`). This is handy for desktop toasts, chat webhooks, CI updates, or any side-channel alerting that the built-in TUI notifications don't cover.

```
notify = ["python3", "/path/to/notify.py"]
```

Example `notify.py` (truncated) that reacts to `agent-turn-complete`:

```
#!/usr/bin/env python3
import json, subprocess, sys

def main() -> int:
    notification = json.loads(sys.argv[1])
    if notification.get("type") != "agent-turn-complete":
        return 0
    title = f"Codex: {notification.get('last-assistant-message', 'Turn Complete!')}"
    message = " ".join(notification.get("input-messages", []))
    subprocess.check_output([
        "terminal-notifier",
        "-title", title,
        "-message", message,
        "-group", "codex-" + notification.get("thread-id", ""),
        "-activate", "com.googlecode.iterm2",
    ])
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

Place the script somewhere on disk and point `notify` to it. For lighter in-terminal alerts, toggle `tui.notifications` instead.

Additionally to configuring the underlying Codex agent through your `config.toml` file, you can also configure the way you use the Codex IDE extension.

To see the list of available configuration options, click the gear icon in the top right corner of the extension and then click `IDE settings`.

To define your own keyboard shortcuts to trigger Codex or add something to the Codex context, you can click the gear icon in the top right corner of the extension and then click `Keyboard shortcuts`.

## Configuration options

| Key | Type / Values | Details |
| --- | --- | --- |
| `model` | `string` | Model to use (e.g., `gpt-5-codex`). |
| `model_provider` | `string` | Provider id from `model_providers` (default: `openai`). |
| `model_context_window` | `number` | Context window tokens available to the active model. |
| `model_max_output_tokens` | `number` | Maximum number of tokens Codex may request from the model. |
| `approval_policy` | `untrusted \| on-failure \| on-request \| never` | Controls when Codex pauses for approval before executing commands. |
| `sandbox_mode` | `read-only \| workspace-write \| danger-full-access` | Sandbox policy for filesystem and network access during command execution. |
| `web_search` | `"live" \| "cached" \| "disabled"` | Web search policy (replaces deprecated `[features].web_search_request`). |
| `sandbox_workspace_write.writable_roots` | `array<string>` | Additional writable roots when `sandbox_mode = "workspace-write"`. |
| `sandbox_workspace_write.network_access` | `boolean` | Allow outbound network access inside the workspace-write sandbox. |
| `sandbox_workspace_write.exclude_tmpdir_env_var` | `boolean` | Exclude `$TMPDIR` from writable roots in workspace-write mode. |
| `sandbox_workspace_write.exclude_slash_tmp` | `boolean` | Exclude `/tmp` from writable roots in workspace-write mode. |
| `notify` | `array<string>` | Command invoked for notifications; receives a JSON payload from Codex. |
| `instructions` | `string` | Reserved for future use; prefer `experimental_instructions_file` or `AGENTS.md`. |
| `mcp_servers.<id>.command` | `string` | Launcher command for an MCP stdio server. |
| `mcp_servers.<id>.args` | `array<string>` | Arguments passed to the MCP stdio server command. |
| `mcp_servers.<id>.env` | `map<string,string>` | Environment variables forwarded to the MCP stdio server. |
| `mcp_servers.<id>.env_vars` | `array<string>` | Additional environment variables to whitelist for an MCP stdio server. |
| `mcp_servers.<id>.cwd` | `string` | Working directory for the MCP stdio server process. |
| `mcp_servers.<id>.url` | `string` | Endpoint for an MCP streamable HTTP server. |
| `mcp_servers.<id>.bearer_token_env_var` | `string` | Environment variable sourcing the bearer token for an MCP HTTP server. |
| `mcp_servers.<id>.http_headers` | `map<string,string>` | Static HTTP headers included with each MCP HTTP request. |
| `mcp_servers.<id>.env_http_headers` | `map<string,string>` | HTTP headers populated from environment variables for an MCP HTTP server. |
| `mcp_servers.<id>.enabled` | `boolean` | Disable an MCP server without removing its configuration. |
| `mcp_servers.<id>.startup_timeout_sec` | `number` | Override the default 10s startup timeout for an MCP server. |
| `mcp_servers.<id>.tool_timeout_sec` | `number` | Override the default 60s per-tool timeout for an MCP server. |
| `mcp_servers.<id>.enabled_tools` | `array<string>` | Allow list of tool names exposed by the MCP server. |
| `mcp_servers.<id>.disabled_tools` | `array<string>` | Deny list applied after `enabled_tools` for the MCP server. |
| `features.unified_exec` | `boolean` | Use the unified PTY-backed exec tool (experimental). |
| `features.streamable_shell` | `boolean` | Switch to the streamable exec command/write-stdin tool pair (experimental). |
| `features.rmcp_client` | `boolean` | Enable the Rust MCP client to unlock OAuth for HTTP servers (experimental). |
| `features.apply_patch_freeform` | `boolean` | Expose the freeform `apply_patch` tool (beta). |
| `features.view_image_tool` | `boolean` | Allow Codex to attach local images via the `view_image` tool (stable; on by default). |
| `features.web_search_request` | `boolean` | Deprecated; set top-level `web_search` instead. |
| `features.experimental_sandbox_command_assessment` | `boolean` | Enable model-based sandbox risk assessment (experimental). |
| `features.ghost_commit` | `boolean` | Create a ghost commit on each turn (experimental). |
| `features.enable_experimental_windows_sandbox` | `boolean` | Run the Windows restricted-token sandbox (experimental). |
| `experimental_use_rmcp_client` | `boolean` | Deprecated; replace with `[features].rmcp_client` or `codex --enable rmcp_client`. |
| `model_providers.<id>.name` | `string` | Display name for a custom model provider. |
| `model_providers.<id>.base_url` | `string` | API base URL for the model provider. |
| `model_providers.<id>.env_key` | `string` | Environment variable supplying the provider API key. |
| `model_providers.<id>.wire_api` | `chat \| responses` | Protocol used by the provider (defaults to `chat` if omitted). |
| `model_providers.<id>.query_params` | `map<string,string>` | Extra query parameters appended to provider requests. |
| `model_providers.<id>.http_headers` | `map<string,string>` | Static HTTP headers added to provider requests. |
| `model_providers.<id>.env_http_headers` | `map<string,string>` | HTTP headers populated from environment variables when present. |
| `model_providers.<id>.request_max_retries` | `number` | Retry count for HTTP requests to the provider (default: 4). |
| `model_providers.<id>.stream_max_retries` | `number` | Retry count for SSE streaming interruptions (default: 5). |
| `model_providers.<id>.stream_idle_timeout_ms` | `number` | Idle timeout for SSE streams in milliseconds (default: 300000). |
| `model_reasoning_effort` | `minimal \| low \| medium \| high` | Adjust reasoning effort for supported models (Responses API only). |
| `model_reasoning_summary` | `auto \| concise \| detailed \| none` | Select reasoning summary detail or disable summaries entirely. |
| `model_verbosity` | `low \| medium \| high` | Control GPT-5 Responses API verbosity (defaults to `medium`). |
| `model_supports_reasoning_summaries` | `boolean` | Force Codex to send reasoning metadata even for unknown models. |
| `model_reasoning_summary_format` | `none \| experimental` | Override the format of reasoning summaries (experimental). |
| `shell_environment_policy.inherit` | `all \| core \| none` | Baseline environment inheritance when spawning subprocesses. |
| `shell_environment_policy.ignore_default_excludes` | `boolean` | Keep variables containing KEY/SECRET/TOKEN before other filters run. |
| `shell_environment_policy.exclude` | `array<string>` | Glob patterns for removing environment variables after the defaults. |
| `shell_environment_policy.include_only` | `array<string>` | Whitelist of patterns; when set only matching variables are kept. |
| `shell_environment_policy.set` | `map<string,string>` | Explicit environment overrides injected into every subprocess. |
| `project_doc_max_bytes` | `number` | Maximum bytes read from `AGENTS.md` when building project instructions. |
| `project_doc_fallback_filenames` | `array<string>` | Additional filenames to try when `AGENTS.md` is missing. |
| `profile` | `string` | Default profile applied at startup (equivalent to `--profile`). |
| `profiles.<name>.*` | `various` | Profile-scoped overrides for any of the supported configuration keys. |
| `history.persistence` | `save-all \| none` | Control whether Codex saves session transcripts to history.jsonl. |
| `history.max_bytes` | `number` | Reserved for future use; currently not enforced. |
| `file_opener` | `vscode \| vscode-insiders \| windsurf \| cursor \| none` | URI scheme used to open citations from Codex output (default: `vscode`). |
| `otel.environment` | `string` | Environment tag applied to emitted OpenTelemetry events (default: `dev`). |
| `otel.exporter` | `none \| otlp-http \| otlp-grpc` | Select the OpenTelemetry exporter and provide any endpoint metadata. |
| `otel.log_user_prompt` | `boolean` | Opt in to exporting raw user prompts with OpenTelemetry logs. |
| `tui` | `table` | TUI-specific options such as enabling inline desktop notifications. |
| `tui.notifications` | `boolean \| array<string>` | Enable TUI notifications; optionally restrict to specific event types. |
| `hide_agent_reasoning` | `boolean` | Suppress reasoning events in both the TUI and `codex exec` output. |
| `show_raw_agent_reasoning` | `boolean` | Surface raw reasoning content when the active model emits it. |
| `chatgpt_base_url` | `string` | Override the base URL used during the ChatGPT login flow. |
| `experimental_instructions_file` | `string (path)` | Experimental replacement for built-in instructions instead of `AGENTS.md`. |
| `experimental_use_exec_command_tool` | `boolean` | Deprecated; use `[features].unified_exec` or `codex --enable unified_exec`. |
| `projects.<path>.trust_level` | `string` | Mark a project or worktree as trusted (only `"trusted"` is recognized). |
| `tools.web_search` | `boolean` | Deprecated; set top-level `web_search` instead. |
| `tools.view_image` | `boolean` | Deprecated; use `[features].view_image_tool` or `codex --enable view_image_tool`. |
| `forced_login_method` | `chatgpt \| api` | Restrict Codex to a specific authentication method. |
| `forced_chatgpt_workspace_id` | `string (uuid)` | Limit ChatGPT logins to a specific workspace identifier. |
