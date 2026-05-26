// Base provider interface — all image providers extend this
export class ImageProvider {
  constructor(config = {}) {
    this.name = 'base'
    this.config = config
    this.features = {
      text2img: false,
      img2img: false,
      inpaint: false,
      upscale: false,
      video: false
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
