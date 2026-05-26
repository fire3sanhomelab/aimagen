// Base provider interface — all image providers extend this.
// Uses native fetch (global in Node 18+) instead of node-fetch. — all image providers extend this
export class ImageProvider {
  constructor(config = {}) {
    this.name = 'base'
    this.config = config
    this.timeout = config.timeout || 30000
    this.features = {
      text2img: false,
      img2img: false,
      inpaint: false,
      upscale: false,
      video: false
    }
  }

  /**
   * Wraps fetch with AbortController timeout so hanging providers
   * don't block the request indefinitely.
   */
  async fetch(url, options = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)
    try {
      return await fetch(url, { ...options, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  async generate({ prompt, negativePrompt, width, height, seed, model }) {
    throw new Error('generate() must be implemented by subclass')
  }

  async img2img({ image, prompt, strength }) {
    throw new Error('img2img() not supported by this provider')
  }

  async getModels() {
    return []
  }

  async healthCheck() {
    return { ok: false, error: 'Not implemented' }
  }
}
