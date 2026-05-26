/**
 * aimagen backend tests — run with: node --test backend/tests/
 */
import { describe, it } from 'node:test'
import assert from 'node:assert'

// ----- Test validate middleware -----
import { validate } from '../src/middleware/validate.js'

describe('validate middleware', () => {
  it('should require prompt for generate', () => {
    const mw = validate(['prompt'])
    const req = { body: { prompt: 'a cat' } }
    mw(req, {}, (err) => {
      assert.strictEqual(err, undefined)
    })
  })

  it('should reject missing prompt', () => {
    const mw = validate(['prompt'])
    const req = { body: {} }
    mw(req, {}, (err) => {
      assert.ok(err)
      assert.strictEqual(err.status, 400)
      assert.match(err.message, /prompt/)
    })
  })
})

// ----- Test provider registry -----
import { getProvider, listProviders, OpencodeGoProvider, OllamaProvider, LLMStudioProvider, ComfyUIProvider, JanusProProvider } from '../src/providers/index.js'

describe('provider registry', () => {
  it('should return default provider when no name given', () => {
    process.env.AI_IMAGE_PROVIDER = 'opencode-go'
    const provider = getProvider()
    assert.ok(provider instanceof OpencodeGoProvider)
    assert.strictEqual(provider.name, 'opencode-go')
  })

  it('should return ollama provider when specified', () => {
    const provider = getProvider('ollama')
    assert.ok(provider instanceof OllamaProvider)
    assert.strictEqual(provider.name, 'ollama')
  })

  it('should return llm-studio provider', () => {
    const provider = getProvider('llm-studio')
    assert.ok(provider instanceof LLMStudioProvider)
  })

  it('should return comfyui provider', () => {
    const provider = getProvider('comfyui')
    assert.ok(provider instanceof ComfyUIProvider)
  })

  it('should return janus-pro provider', () => {
    const provider = getProvider('janus-pro')
    assert.ok(provider instanceof JanusProProvider)
  })

  it('should throw for unknown provider', () => {
    assert.throws(() => getProvider('nonexistent'), /Unknown provider/)
  })

  it('should list all providers with features', () => {
    const providers = listProviders()
    assert.ok(providers.length >= 5)
    const opencode = providers.find(p => p.name === 'opencode-go')
    assert.ok(opencode.features.text2img)
    assert.ok(opencode.features.img2img)
  })
})

// ----- Test provider base class -----
import { ImageProvider } from '../src/providers/base.js'

describe('ImageProvider base class', () => {
  it('should have default features all false', () => {
    const p = new ImageProvider()
    assert.strictEqual(p.features.text2img, false)
    assert.strictEqual(p.features.img2img, false)
    assert.strictEqual(p.features.video, false)
  })

  it('should throw on generate()', async () => {
    const p = new ImageProvider()
    await assert.rejects(() => p.generate({ prompt: 'test' }), /generate/)
  })

  it('should throw on img2img()', async () => {
    const p = new ImageProvider()
    await assert.rejects(() => p.img2img({}), /img2img/)
  })

  it('should return empty models list', async () => {
    const p = new ImageProvider()
    const models = await p.getModels()
    assert.deepStrictEqual(models, [])
  })

  it('should default health check to not ok', async () => {
    const p = new ImageProvider()
    const health = await p.healthCheck()
    assert.strictEqual(health.ok, false)
  })

  it('should have configurable timeout', () => {
    const p = new ImageProvider({ timeout: 5000 })
    assert.strictEqual(p.timeout, 5000)
  })
})

// ----- Test sanitize -----
function sanitizePrompt(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').slice(0, 2000)
}

describe('sanitizePrompt', () => {
  it('should strip control characters', () => {
    const result = sanitizePrompt('hello\x00world\x0Btest')
    assert.strictEqual(result, 'helloworldtest')
  })

  it('should truncate to 2000 chars', () => {
    const long = 'x'.repeat(3000)
    assert.strictEqual(sanitizePrompt(long).length, 2000)
  })

  it('should handle non-string', () => {
    assert.strictEqual(sanitizePrompt(null), '')
    assert.strictEqual(sanitizePrompt(undefined), '')
  })
})

// ----- Test errorHandler -----
import { errorHandler } from '../src/middleware/errorHandler.js'

describe('errorHandler', () => {
  it('should mask internal errors in production', () => {
    process.env.NODE_ENV = 'production'
    const err = new Error('secret')
    const res = {
      statusCode: null,
      status(code) { this.statusCode = code; return this },
      json(body) { this.body = body }
    }
    errorHandler(err, { method: 'GET', path: '/test' }, res, () => {})
    assert.strictEqual(res.statusCode, 500)
    assert.strictEqual(res.body.error, 'Internal Server Error')
    assert.strictEqual(res.body.stack, undefined)
    delete process.env.NODE_ENV
  })
})
