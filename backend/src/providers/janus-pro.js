import { ImageProvider } from './base.js'

/**
 * Local provider: Janus Pro (via HuggingFace/transformers or dedicated server)
 * DeepSeek's multimodal model — good for understanding + generation
 */
export class JanusProProvider extends ImageProvider {
  constructor(config = {}) {
    super(config)
    this.name = 'janus-pro'
    this.baseUrl = config.baseUrl || process.env.JANUS_PRO_URL || 'http://localhost:8000'
    this.features = {
      text2img: true,
      img2img: false,
      inpaint: false,
      upscale: false,
      video: false
    }
  }

  async generate({ prompt, negativePrompt = '', width = 512, height = 512, seed, model = 'janus-pro-7b' }) {
    const response = await this.fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        ...(negativePrompt && { negative_prompt: negativePrompt }),
        width,
        height,
        ...(seed && { seed }),
        model
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Janus Pro error: ${err}`)
    }

    const data = await response.json()
    return {
      imageBase64: data.image,
      imageUrl: data.url,
      model: data.model || model,
      provider: this.name
    }
  }

  async getModels() {
    return [
      { id: 'janus-pro-1b', name: 'Janus Pro 1B', type: 'local' },
      { id: 'janus-pro-7b', name: 'Janus Pro 7B', type: 'local' }
    ]
  }

  async healthCheck() {
    try {
      const response = await this.fetch(`${this.baseUrl}/health`)
      return { ok: response.ok, status: response.status }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }
}
