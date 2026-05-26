# aimagen

AI Image & Video Generation — generate images and videos from text prompts or reference uploads.

## Features

- 🖼️ Text-to-image generation
- 📤 Upload reference images for img2img
- 🎬 Video generation jobs (queued processing)
- 🖼️ Gallery with history & delete
- 📱 PWA — install on mobile/desktop

## Architecture

```
aimagen/
├── src/              # Vue 3 frontend
├── backend/          # Express.js API
├── docker/           # Docker configs
└── docker-compose.yml
```

## Quick Start

### Local Dev

```bash
# Terminal 1 - backend
cd backend
npm install
npm run dev

# Terminal 2 - frontend
cd ..
npm install
npm run dev
# Opens at http://localhost:3002
```

### Docker

```bash
docker-compose up -d
# Frontend: http://localhost:3002
# Backend API: http://localhost:3457
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://host.docker.internal:11434` | Local Ollama instance |
| `LLM_STUDIO_URL` | `http://192.168.1.100:1234` | LM Studio fallback |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/generate` | Text-to-image |
| POST | `/api/generate-video` | Queue video job |
| POST | `/api/upload` | Upload reference image |
| POST | `/api/img2img` | Image-to-image |
| GET | `/api/gallery` | List generated images |
| DELETE | `/api/gallery/:id` | Delete image |
| GET | `/api/jobs/:id` | Check video job status |

## Tech Stack

- **Frontend:** Vue 3, Vite, Vite PWA
- **Backend:** Express, Multer, node-fetch
- **AI:** Ollama, LM Studio (OpenAI-compatible)

## License

MIT
