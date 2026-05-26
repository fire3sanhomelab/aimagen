import { ImageProvider } from './base.js'
import fetch from 'node-fetch'

/**
 * Local provider: LM Studio (Mac Mini)
 * OpenAI-compatible local server
 */
export class LLMStudioProvider extends ImageProvider {
  constructor(config = {}) {
    super(config)
    this.name = 'llm-studio'
    this.baseUrl = config.baseUrl || process.env.LLM_STUDIO_URL || 'http://192.168.1.100:1234'
    this.features = {
      text2img: true,
      img2img: true,
      inpaint: false,
      upscale: false,
      video: false
    }
  }

  async generate({ prompt, negativePrompt = '', width = 512, height = 512, seed, model }) {
    const response = await fetch(`${this.baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        ...(negativePrompt && { negative_prompt: negativePrompt }),
        n: 1,
        size: `${width}x${height}`,
        ...(seed && { seed })
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`LLM Studio error: ${err}`)
    }

    const data = await response.json()
    return {
      imageUrl: data.data?.[0]?.url,
      imageBase64: data.data?.[0]?.b64_json,
      model: data.model || model,
      provider: this.name
    }
  }

  async img2img({ imageBase64, prompt, strength = 0.75 }) {
    const response = await fetch(`${this.baseUrl}/v1/images/edits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageBase64,
        prompt,
        strength
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`LLM Studio img2img error: ${err}`)
    }

    const data = await response.json()
    return {
      imageUrl: data.data?.[0]?.url,
      imageBase64: data.data?.[0]?.b64_json,
      provider: this.name
    }
  }

  async getModels() {
    try {
      const response = await this.fetch(`${this.baseUrl}/v1/models`)
      const data = await response.json()
      return (data.data || []).map(m => ({
        id: m.id,
        name: m.id,
        type: 'local'
      }))
    } catch {
      return []
    }
  }

  async healthCheck() {
    try {
      const response = await this.fetch(`${this.baseUrl}/v1/models`)
      return { ok: response.ok, status: response.status }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }
}
