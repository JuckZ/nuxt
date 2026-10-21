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
| `GET /api/clash?keyword=...` | Download and merge a Clash subscription |
| `POST /api/xiaoai` | XiaoAI custom skill, backed by `chat-fast` |
| `GET /api/sum?a=1&b=2` | Minimal WebAssembly example |
| `GET /api/ntfy?name=Nuxt` | Go WebAssembly example |

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The AI endpoint tests start an in-process OpenAI-compatible mock gateway and cover request validation, profile routing, tools, non-streaming text, structured output, and streaming text without requiring external credentials.

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
