# 🎨 aimagen

> AI Image & Video Generation — switchable cloud & local backends with a unified API.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stack: Vue 3](https://img.shields.io/badge/Frontend-Vue%203-4FC08D?logo=vue.js)](https://vuejs.org)
[![Stack: Express](https://img.shields.io/badge/Backend-Express-000000?logo=express)](https://expressjs.com)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](https://docs.docker.com)

---

## 📁 Structure

```
aimagen/
├── frontend/                # Vue 3 SPA (Vite + PWA)
│   ├── src/
│   │   ├── components/      # GeneratePanel, GalleryPanel,
│   │   │                    #   ModeSelector, VideoJobsPanel
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── docker/
│       ├── Dockerfile        # Multi-stage (node build → nginx serve)
│       └── nginx.conf
├── backend/                 # Express API + Provider Registry
│   ├── src/
│   │   ├── providers/       # ☁️ Cloud + 🏠 Local backends
│   │   │   ├── base.js          # Abstract interface
│   │   │   ├── index.js         # Registry & routing
│   │   │   ├── opencode-go.js   # ☁️ Cloud (OpenAI-compatible)
│   │   │   ├── ollama.js        # 🏠 Local Ollama
│   │   │   ├── llm-studio.js    # 🏠 Local Mac Mini
│   │   │   ├── comfyui.js       # 🏠 Local ComfyUI
│   │   │   └── janus-pro.js     # 🏠 Local Janus Pro
│   │   └── server.js        # Routes: generate, gallery, upload
│   ├── data/                # Gallery JSON store
│   ├── uploads/             # User uploads
│   ├── public/gallery/      # Generated images
│   ├── package.json
│   └── docker/
│       └── Dockerfile
├── docker-compose.yml       # One-command deploy
├── .env
└── README.md
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🖼️ **Text-to-Image** | Generate from text prompts |
| 📤 **Image-to-Image** | Upload reference + apply prompt |
| 🔄 **Provider Switch** | Cloud ↔ Local on the fly (env / per-request) |
| 🎬 **Video Jobs** | Asynchronous video generation queue |
| 🖼️ **Gallery** | Browse, search, delete generated images |
| 📊 **Provider Stats** | Track which provider generates what |
| 🏥 **Health Check** | Per-provider online/offline status |
| 📱 **PWA** | Install on mobile/desktop |

---

## 🔄 Provider Switching

### Providers

| Provider | Type | text2img | img2img | Best For |
|----------|------|:--------:|:-------:|----------|
| `opencode-go` | ☁️ Cloud | ✅ | ✅ | Quality & speed |
| `ollama` | 🏠 Local | ✅ | — | Quick tests, LLaVA |
| `llm-studio` | 🏠 Local | ✅ | ✅ | Mac Mini, OpenAI-compat |
| `comfyui` | 🏠 Local | ✅ | ✅ | SDXL, Flux, ControlNet |
| `janus-pro` | 🏠 Local | ✅ | — | Multimodal understanding |

### 3 Ways to Switch

**1. Environment (global default)**
```bash
# .env
AI_IMAGE_PROVIDER=comfyui
```

**2. Per-request override**
```http
POST /api/generate
{ "prompt": "a cat", "provider": "ollama" }
```

**3. Docker compose**
```bash
AI_IMAGE_PROVIDER=llm-studio docker-compose up -d
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 20
- At least one backend running:
  - [Ollama](https://ollama.com) locally
  - [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
  - LM Studio on Mac
  - OpenCode API key

### Development

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev        # → http://localhost:3457

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev        # → http://localhost:3002
```

### Docker

```bash
docker-compose up -d
```

| Service | URL |
|----------|-----|
| Frontend | http://localhost:3002 |
| Backend  | http://localhost:3457 |

---

## 🔧 Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_IMAGE_PROVIDER` | `opencode-go` | Default provider |
| `OPENCODE_API_KEY` | — | Cloud API key |
| `OLLAMA_URL` | `http://host.docker.internal:11434` | Ollama |
| `LLM_STUDIO_URL` | `http://192.168.1.100:1234` | Mac Mini LM Studio |
| `COMFYUI_URL` | `http://host.docker.internal:8188` | ComfyUI |
| `JANUS_PRO_URL` | `http://host.docker.internal:8000` | Janus Pro |

---

## 📡 API Reference

### Generate Image

```http
POST /api/generate
Content-Type: application/json

{
  "prompt": "a cat in space",
  "negativePrompt": "blurry",
  "width": 512,
  "height": 512,
  "provider": "opencode-go"
}
```

### Image-to-Image

```http
POST /api/img2img
Content-Type: multipart/form-data

image: <file>
prompt: "make it Van Gogh style"
strength: 0.75
```

### All Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health + all provider status |
| `GET` | `/api/providers` | List providers & features |
| `GET` | `/api/providers/:name/models` | Provider model list |
| `POST` | `/api/generate` | Text-to-image |
| `POST` | `/api/generate-video` | Queue video job |
| `POST` | `/api/upload` | Upload reference image |
| `POST` | `/api/img2img` | Image-to-image |
| `GET` | `/api/gallery` | List generated images |
| `DELETE` | `/api/gallery/:id` | Delete image |
| `GET` | `/api/jobs/:id` | Video job status |
| `GET` | `/api/stats` | Generation statistics |

---

## 🔌 Adding a Provider

1. Create `backend/src/providers/my-provider.js` extending `ImageProvider`
2. Implement `generate()` and optionally `img2img()`
3. Register in `backend/src/providers/index.js`

```js
import { ImageProvider } from './base.js'

export class MyProvider extends ImageProvider {
  async generate({ prompt, width, height }) { ... }
  async healthCheck() { ... }
}
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vue 3, Vite, Vite PWA |
| **Backend** | Express.js, Multer |
| **AI** | OpenCode, Ollama, LM Studio, ComfyUI, Janus Pro |
| **Pattern** | Provider Registry (strategy pattern) |
| **Container** | Docker, Nginx |

---

## 📜 License

MIT © San Fung
