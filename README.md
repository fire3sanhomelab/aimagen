# aimagen

AI Image & Video Generation — generate images and videos from text prompts or reference uploads.

**Key feature: Switch between cloud and local providers via config.**

## Features

- 🖼️ **Text-to-image** — generate from prompts
- 📤 **Image-to-image** — upload reference, apply prompt
- 🎬 **Video generation** — queued processing
- 🖼️ **Gallery** — history with provider tracking
- 🔄 **Provider switching** — cloud ↔ local on the fly
- 📱 **PWA** — install on mobile/desktop

## Architecture

```
aimagen/
├── src/                      # Vue 3 frontend
├── backend/
│   ├── src/
│   │   ├── server.js         # Express API
│   │   └── providers/        # Provider registry
│   │       ├── base.js       # Abstract interface
│   │       ├── opencode-go.js   # ☁️ Cloud
│   │       ├── ollama.js        # 🏠 Local
│   │       ├── llm-studio.js    # 🏠 Local (Mac Mini)
│   │       ├── comfyui.js       # 🏠 Local (ComfyUI)
│   │       └── janus-pro.js     # 🏠 Local (Janus Pro)
│   ├── docker/
│   └── docker-compose.yml
└── README.md
```

## Provider Switching

### 1. Environment Variable (Global Default)

```bash
# .env
AI_IMAGE_PROVIDER=opencode-go   # ☁️ Cloud
AI_IMAGE_PROVIDER=ollama        # 🏠 Local
AI_IMAGE_PROVIDER=comfyui       # 🏠 Local (most powerful)
```

### 2. Per-Request Override

```bash
# Use a different provider for this request only
curl -X POST http://localhost:3457/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a cat in space",
    "provider": "ollama"   # ← override default
  }'
```

### 3. Provider Health Check

```bash
curl http://localhost:3457/api/health
# Shows which providers are online
```

## Providers

| Provider | Type | text2img | img2img | Best For |
|----------|------|----------|---------|----------|
| `opencode-go` | ☁️ Cloud | ✅ | ✅ | Quality, speed |
| `ollama` | 🏠 Local | ✅ | ❌ | Quick tests, LLaVA |
| `llm-studio` | 🏠 Local | ✅ | ✅ | Mac Mini, OpenAI-compatible |
| `comfyui` | 🏠 Local | ✅ | ✅ | SDXL, Flux, ControlNet |
| `janus-pro` | 🏠 Local | ✅ | ❌ | Multimodal understanding |

## Quick Start

### Local Dev

```bash
# Terminal 1 - backend
cd backend
npm install
npm run dev        # Port 3457

# Terminal 2 - frontend
cd ..
npm install
npm run dev        # Port 3002
```

### Docker

```bash
# Default provider from .env
docker-compose up -d

# Or override for this run
AI_IMAGE_PROVIDER=comfyui docker-compose up -d
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_IMAGE_PROVIDER` | `opencode-go` | Default provider |
| `OPENCODE_API_KEY` | — | Cloud API key |
| `OLLAMA_URL` | `http://host.docker.internal:11434` | Ollama endpoint |
| `LLM_STUDIO_URL` | `http://192.168.1.100:1234` | LM Studio (Mac Mini) |
| `COMFYUI_URL` | `http://host.docker.internal:8188` | ComfyUI endpoint |
| `JANUS_PRO_URL` | `http://host.docker.internal:8000` | Janus Pro endpoint |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health + provider status |
| GET | `/api/providers` | List all providers |
| POST | `/api/generate` | Text-to-image |
| POST | `/api/generate-video` | Queue video job |
| POST | `/api/upload` | Upload reference image |
| POST | `/api/img2img` | Image-to-image |
| GET | `/api/gallery` | List generated images |
| DELETE | `/api/gallery/:id` | Delete image |
| GET | `/api/stats` | Generation stats |

## Adding a New Provider

1. Create `backend/src/providers/my-provider.js`
2. Extend `ImageProvider` base class
3. Implement `generate()` and optionally `img2img()`
4. Register in `backend/src/providers/index.js`

## License

MIT
