# Nuxt AI Playground

A Nuxt 4 full-stack playground for AI chat, XiaoAI voice skills, image discovery, Clash configuration processing, and WebAssembly experiments.

## Stack

- Nuxt 4, Vue 3, Vue Router 5, Nitro, and Vite 8
- Strict TypeScript across application and server source
- Vercel AI SDK Core 7 and the OpenAI-compatible provider
- LiteLLM Gateway as the only language-model boundary
- Baidu Translate, Pexels, and Pixabay
- Go and WebAssembly
- ESLint, Vitest, and Nuxt Test Utils
- pnpm 12

The only JavaScript source kept in the repository is `server/vendor/go/wasm_exec.js`. It is generated and versioned with the installed Go toolchain; application code and configuration are TypeScript.

## Requirements

- Node.js 22.19+, 24.11+, or 26+
- pnpm 12.5+
- A LiteLLM Gateway for AI routes
- Go 1.27+ only when rebuilding the Go WebAssembly demo

## Setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Nuxt maps the `NUXT_*` variables in `.env.example` to private `runtimeConfig` values. AI credentials and upstream model identifiers belong in LiteLLM, not in this application.

## LiteLLM Gateway

The application sends every language-model request to one server-only OpenAI-compatible URL. Copy [`docs/litellm.config.example.yaml`](docs/litellm.config.example.yaml), set its upstream environment variables, and run LiteLLM, for example:

```bash
litellm --config docs/litellm.config.example.yaml --port 4000
```

Configure Nuxt with only the gateway URL, a LiteLLM key, and the three stable application profiles:

```dotenv
NUXT_AI_GATEWAY_BASE_URL=http://127.0.0.1:4000/v1
NUXT_AI_GATEWAY_API_KEY=your-litellm-virtual-key
NUXT_AI_MODEL_CHAT_FAST=chat-fast
NUXT_AI_MODEL_CHAT_QUALITY=chat-quality
NUXT_AI_MODEL_REASONING=reasoning
```

The right-hand values are LiteLLM `model_name` groups. They can be overridden per environment, while clients continue to use only `chat-fast`, `chat-quality`, or `reasoning`. The centralized mapping is private server configuration and real upstream model names are never returned by the API.

## Unified AI API

`POST /api/ai/chat` accepts exactly one of `prompt` or `messages`:

```json
{
  "profile": "chat-fast",
  "messages": [
    { "role": "system", "content": "Answer concisely." },
    { "role": "user", "content": "What is Nitro?" }
  ],
  "stream": true,
  "responseFormat": "text",
  "tools": ["current-time"]
}
```

- `profile`: `chat-fast`, `chat-quality`, or `reasoning`; defaults to `chat-fast`.
- `stream`: defaults to `true`. Streaming responses are AI SDK-managed `text/plain` streams, not application-authored SSE.
- `responseFormat`: `text` or `structured`. Structured responses return `{ answer, summary, followUps }` and currently require `stream: false`.
- `tools`: optional server-owned tools. `current-time` demonstrates AI SDK tool calling with validated input and a bounded five-step loop.

A non-streaming text result includes `profile`, `text`, `finishReason`, and normalized token `usage`. A structured result replaces `text` with the validated `output` object.

## Migration from direct providers

The old OpenAI SDK, Spark WebSocket client, and Wenxin-compatible client and credentials have been removed. Delete these obsolete deployment variables if they still exist:

- `NUXT_OPENAI_*`
- `NUXT_SPARK_*`
- `NUXT_WENXIN_*`

Legacy GET routes remain temporarily as thin compatibility adapters:

| Legacy route | Internal profile |
| --- | --- |
| `/api/aichat/OpenAI?keyword=...` | `chat-quality` |
| `/api/aichat/ChatGPT?keyword=...` | `chat-quality` |
| `/api/aichat/Spark?keyword=...` | `chat-fast` |
| `/api/aichat/ERNIE-Bot?keyword=...` | `chat-quality` |

They return the former `{ data: string }` shape plus `Deprecation` and successor `Link` headers. New clients should migrate to `POST /api/ai/chat`. The retired Bing connector and `/api/aichat/GenImageWithChatGPT` return HTTP 410.

## Compatibility considerations

- Tool calling requires the selected upstream model and LiteLLM adapter to preserve OpenAI-compatible tool calls. The route exposes only allow-listed, server-executed tools.
- Structured output requires JSON Schema support from the selected model/adapter. Validate each configured model group when changing upstreams; the server also validates the final object with Zod.
- Image and audio generation are intentionally outside the unified chat contract. Provider capabilities and response formats vary, so add separate typed endpoints and AI SDK model adapters before restoring them.
- Provider-specific reasoning options are intentionally not accepted from clients. Put routing and model-specific policy in LiteLLM or in the server-owned profile implementation.

## Other API routes

| Route | Purpose |
| --- | --- |
| `GET /api/baidu_translate/vip/translate?keyword=...` | Chinese-to-English translation |
| `GET /api/gen_image/from_keyword?keyword=...&origin=pexels` | Translate a keyword and find an image |
| `GET /api/c?k=...` | Merge multiple subscriptions and standalone nodes; `/api/clash?keyword=...` remains supported |
| `POST /api/xiaoai` | XiaoAI custom skill, backed by `chat-fast` |
| `GET /api/sum?a=1&b=2` | Minimal WebAssembly example |
| `GET /api/ntfy?name=Nuxt` | Go WebAssembly example |

## Multiple Clash subscriptions and standalone nodes

Create `clash.config.yaml` in the project root using the structure in [clash.config.example.yaml](clash.config.example.yaml). The real file is ignored by Git and must stay outside `public/` and `server/assets/`.

```yaml
default:
  subscriptions: []
  proxies: []

private:
  subscriptions:
    - name: 订阅A
      url: "https://provider-a.example.com/subscribe?token=replace-me"
    - name: 订阅B
      url: "https://provider-b.example.com/subscribe?token=replace-me"
      timeoutMs: 10000
  proxies:
    - name: 美国自建SS
      type: ss
      server: "your-server.example.com"
      port: 443
      cipher: aes-128-gcm
      password: "replace-me"
      udp: true
```

Set these server-only variables in `.env`:

```dotenv
NUXT_CLASH_SOURCES_FILE=./clash.config.yaml
NUXT_CLASH_SUB_KEY=your-private-access-key
```

Then import the following address into a Clash/Mihomo client, or open it in a browser to inspect the YAML:

- `http://localhost:3000/api/c` exports only `default`.
- `http://localhost:3000/api/c?k=your-private-access-key` exports only `private` when the non-empty key matches. URL-encode the key if it contains special characters.
- An absent or incorrect key uses `default`; it never exports private nodes. Profiles do not inherit from each other. Put sensitive subscriptions and nodes under `private`.

The legacy `/api/clash` path and `keyword` parameter remain supported, including `/api/clash?k=...` and `/api/c?keyword=...`. Both paths execute the same handler without a redirect. If both parameters are supplied, `k` takes precedence. Repeated key parameters are rejected with HTTP 400.

The YAML file is read on each request, so edits take effect on the next refresh. Restart the development server after changing `.env`. For another device on the LAN, replace `localhost` with this server's LAN address. For deployment, provision the private file separately and set an absolute path when the working directory differs. The file is not bundled into the production build; runtimes must support reading the provisioned file.

Each subscription must return a Clash/Mihomo YAML document containing a non-empty `proxies` list. Plain URI/Base64 subscriptions and documents containing only remote `proxy-providers` are not converted by this server. Standalone nodes use the standard [Mihomo proxy YAML format](https://wiki.metacubex.one/config/proxies/); fields such as `uuid`, `sni`, `reality-opts`, and transport options are retained. Convert sharing links such as `vless://` to their corresponding YAML entries first.

Aggregation behavior:

- Download sources concurrently, with a 10-second default timeout per source (`timeoutMs`: 100–60000). A failed source is skipped when other sources or standalone nodes are usable. If none remain, the endpoint returns HTTP 502.
- Keep all nodes from different sources, prefixing their names with `[订阅名]` and resolving remaining name collisions. Source names must be unique, as must node names within each source or standalone list. Node-to-node `dialer-proxy` references are rewritten after renaming; missing references and cycles are rejected.
- Generate `📦 订阅名` groups, `🛠 独立节点`, `🔰 AllProxy`, and `🤖 USProxy`. US matching uses node names containing 美国, 美國, US, USA, United States, or 🇺🇸. When no US node is found, that group falls back to `AllProxy`.
- Use the shared rules in `server/assets/mixin.yaml`. Upstream rules, groups, providers, DNS, and other top-level settings are not imported in aggregate mode. Source nodes that depend on upstream groups are unsupported. Mixin proxies/groups are appended rather than replacing merged nodes; custom mixin groups must have unique, non-reserved names and reference existing targets.
- Return `X-Clash-Source-Count` and `X-Clash-Failed-Source-Count` for subscription download results. A single upstream's quota header is forwarded only when there is exactly one subscription and no standalone nodes; no misleading combined quota is generated.

Legacy `NUXT_FREE_CLASH_SUB_URL` and `NUXT_CLASH_SUB_URL` still work when the selected profile has no subscriptions or standalone nodes, or the sources file is absent. New profiles take precedence over those legacy URLs, even if their upstream downloads fail. An invalid local configuration returns a sanitized error instead of silently falling back.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The endpoint tests start an in-process mock server. They cover AI requests and streaming, Clash aggregation, profile isolation, duplicate names, standalone nodes, failed/slow upstreams, and legacy subscription compatibility without external credentials.

## Rebuild Go WebAssembly

On Linux or macOS:

```bash
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" server/vendor/go/wasm_exec.js
GOOS=js GOARCH=wasm go build -o public/ntfy.wasm ./server/api/ntfy/ntfy.go
```

On PowerShell:

```powershell
Copy-Item "$(go env GOROOT)/lib/wasm/wasm_exec.js" server/vendor/go/wasm_exec.js
$env:GOOS = "js"
$env:GOARCH = "wasm"
go build -o public/ntfy.wasm ./server/api/ntfy/ntfy.go
```

## Deployment

The repository includes a minimal Vercel configuration. Configure the gateway and any other required `NUXT_*` environment variables in the deployment environment, then use the standard Nuxt build command. The deployed runtime must be able to reach `NUXT_AI_GATEWAY_BASE_URL`.
