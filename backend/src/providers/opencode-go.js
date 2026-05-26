import { ImageProvider } from './base.js'

/**
 * Cloud provider: opencode-go (kimi-k2.6, etc.)
 * Uses OpenAI-compatible API
 */
export class OpencodeGoProvider extends ImageProvider {
  constructor(config = {}) {
    super(config)
    this.name = 'opencode-go'
    this.baseUrl = config.baseUrl || 'https://api.opencode.ai'
    this.apiKey = config.apiKey || process.env.OPENCODE_API_KEY
    this.features = {
      text2img: true,
      img2img: true,
      inpaint: false,
      upscale: false,
      video: false
    }
  }

  async generate({ prompt, negativePrompt = '', width = 512, height = 512, seed, model = 'kimi-k2.6' }) {
    const response = await this.fetch(`${this.baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        prompt,
        ...(negativePrompt && { negative_prompt: negativePrompt }),
        n: 1,
        size: `${width}x${height}`,
        ...(seed && { seed }),
        response_format: 'b64_json'
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`OpencodeGo error: ${err}`)
    }

    const data = await response.json()
    return {
      imageBase64: data.data?.[0]?.b64_json,
      imageUrl: data.data?.[0]?.url,
      model: data.model || model,
      provider: this.name
    }
  }

  async img2img({ imageBase64, prompt, strength = 0.75 }) {
    const response = await this.fetch(`${this.baseUrl}/v1/images/edits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        image: imageBase64,
        prompt,
        strength
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`OpencodeGo img2img error: ${err}`)
    }

    const data = await response.json()
    return {
      imageBase64: data.data?.[0]?.b64_json,
      imageUrl: data.data?.[0]?.url,
      provider: this.name
    }
  }

  async getModels() {
    // Static list or fetch from API if available
    return [
      { id: 'kimi-k2.6', name: 'Kimi K2.6', type: 'image' }
    ]
  }

  async healthCheck() {
    try {
      const response = await this.fetch(`${this.baseUrl}/v1/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      })
      return { ok: response.ok, status: response.status }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }
}
