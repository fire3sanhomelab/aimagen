import { ImageProvider } from './base.js'
import fs from 'fs/promises'

/**
 * Local provider: ComfyUI
 * Most powerful local image gen (SDXL, Flux, ControlNet, etc.)
 * Uses ComfyUI's workflow JSON API
 */
export class ComfyUIProvider extends ImageProvider {
  constructor(config = {}) {
    super(config)
    this.name = 'comfyui'
    this.baseUrl = config.baseUrl || process.env.COMFYUI_URL || 'http://localhost:8188'
    this.features = {
      text2img: true,
      img2img: true,
      inpaint: true,
      upscale: true,
      video: false
    }
  }

  async generate({ prompt, negativePrompt = '', width = 512, height = 512, seed, model = 'sdxl' }) {
    // Build ComfyUI workflow
    const workflow = this.buildText2ImgWorkflow({ prompt, negativePrompt, width, height, seed })

    // Queue the prompt
    const queueResponse = await this.fetch(`${this.baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow })
    })

    if (!queueResponse.ok) {
      const err = await queueResponse.text()
      throw new Error(`ComfyUI queue error: ${err}`)
    }

    const { prompt_id } = await queueResponse.json()

    // Poll for result
    const imageData = await this.pollForImage(prompt_id)

    return {
      imageBase64: imageData,
      prompt_id,
      model,
      provider: this.name
    }
  }

  buildText2ImgWorkflow({ prompt, negativePrompt, width, height, seed }) {
    // Simplified workflow — in production, load from JSON file
    const workflowId = Math.random().toString(36).substring(7)
    return {
      [workflowId + '_1']: {
        inputs: { text: prompt, clip: ['4', 1] },
        class_type: 'CLIPTextEncode'
      },
      [workflowId + '_2']: {
        inputs: { text: negativePrompt, clip: ['4', 1] },
        class_type: 'CLIPTextEncode'
      },
      [workflowId + '_3']: {
        inputs: {
          seed: seed || Math.floor(Math.random() * 9999999999),
          steps: 20,
          cfg: 8,
          sampler_name: 'euler',
          scheduler: 'normal',
          denoise: 1,
          model: ['4', 0],
          positive: [workflowId + '_1', 0],
          negative: [workflowId + '_2', 0],
          latent_image: {
            inputs: { width, height, batch_size: 1 },
            class_type: 'EmptyLatentImage'
          }
        },
        class_type: 'KSampler'
      },
      '4': {
        inputs: { ckpt_name: 'sdxl_base.safetensors' },
        class_type: 'CheckpointLoaderSimple'
      }
    }
  }

  async pollForImage(promptId, maxAttempts = 60) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 1000))

      const historyResponse = await this.fetch(`${this.baseUrl}/history/${promptId}`)
      const history = await historyResponse.json()

      if (history[promptId]?.outputs) {
        // Get image from outputs
        const outputs = history[promptId].outputs
        const imageNode = Object.values(outputs).find(o => o.images)
        if (imageNode?.images?.[0]) {
          const img = imageNode.images[0]
          const imageResponse = await this.fetch(`${this.baseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=output`)
          const buffer = await imageResponse.arrayBuffer()
          return Buffer.from(buffer).toString('base64')
        }
      }
    }

    throw new Error('ComfyUI generation timed out')
  }

  async img2img({ imageBase64, prompt, strength = 0.75 }) {
    // Load image, encode, build img2img workflow
    // This is a simplified version — real implementation needs image upload node
    throw new Error('ComfyUI img2img requires workflow customization')
  }

  async getModels() {
    try {
      const response = await this.fetch(`${this.baseUrl}/object_info/CheckpointLoaderSimple`)
      const data = await response.json()
      const models = data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || []
      return models.map(m => ({ id: m, name: m, type: 'local' }))
    } catch {
      return [
        { id: 'sdxl_base.safetensors', name: 'SDXL Base', type: 'local' },
        { id: 'flux1-dev.safetensors', name: 'Flux.1 Dev', type: 'local' }
      ]
    }
  }

  async healthCheck() {
    try {
      const response = await this.fetch(`${this.baseUrl}/system_stats`)
      return { ok: response.ok, status: response.status }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }
}
