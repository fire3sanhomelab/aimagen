import { ImageProvider } from './base.js'
import fetch from 'node-fetch'

/**
 * Local provider: Ollama
 * Best for running multimodal models locally (llava, bakllava, etc.)
 * Note: Ollama's native API for image gen is limited; this uses /api/generate
 */
export class OllamaProvider extends ImageProvider {
  constructor(config = {}) {
    super(config)
    this.name = 'ollama'
    this.baseUrl = config.baseUrl || process.env.OLLAMA_URL || 'http://localhost:11434'
    this.features = {
      text2img: true,
      img2img: false,  // Limited support
      inpaint: false,
      upscale: false,
      video: false
    }
  }

  async generate({ prompt, negativePrompt = '', width = 512, height = 512, seed, model = 'llava' }) {
    // Ollama /api/generate can produce images with certain models
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        images: [],
        stream: false,
        options: {
          ...(seed && { seed }),
          num_ctx: 4096
        }
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Ollama error: ${err}`)
    }

    const data = await response.json()
    return {
      // Ollama may return base64 in response.images or similar
      imageBase64: data.images?.[0],
      text: data.response,
      model,
      provider: this.name
    }
  }

  async getModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      const data = await response.json()
      return (data.models || []).map(m => ({
        id: m.name,
        name: m.name,
        type: 'local'
      }))
    } catch {
      return [
        { id: 'llava', name: 'LLaVA', type: 'local' },
        { id: 'bakllava', name: 'BakLLaVA', type: 'local' }
      ]
    }
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      return { ok: response.ok, status: response.status }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }
}
