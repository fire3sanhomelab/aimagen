import { OpencodeGoProvider } from './opencode-go.js'
import { OllamaProvider } from './ollama.js'
import { LLMStudioProvider } from './llm-studio.js'
import { ComfyUIProvider } from './comfyui.js'
import { JanusProProvider } from './janus-pro.js'

/**
 * Provider registry — add new providers here
 */
const providerRegistry = {
  'opencode-go': OpencodeGoProvider,
  'ollama': OllamaProvider,
  'llm-studio': LLMStudioProvider,
  'comfyui': ComfyUIProvider,
  'janus-pro': JanusProProvider
}

/**
 * Get active provider based on config
 * Priority: 1. env var  2. request param  3. default
 */
export function getProvider(name = null) {
  const providerName = name || process.env.AI_IMAGE_PROVIDER || 'opencode-go'
  const ProviderClass = providerRegistry[providerName]

  if (!ProviderClass) {
    throw new Error(`Unknown provider: ${providerName}. Available: ${Object.keys(providerRegistry).join(', ')}`)
  }

  return new ProviderClass()
}

/**
 * List all available providers with their features
 */
export function listProviders() {
  return Object.entries(providerRegistry).map(([name, ProviderClass]) => {
    const instance = new ProviderClass()
    return {
      name,
      features: instance.features,
      health: null // Would need async check
    }
  })
}

/**
 * Check health of all providers (parallel, 5s timeout each)
 */
export async function healthCheckAll() {
  const results = {}
  const providers = Object.entries(providerRegistry).map(async ([name, ProviderClass]) => {
    const instance = new ProviderClass()
    try {
      // 5-second timeout per provider so health check completes fast
      const result = await Promise.race([
        instance.healthCheck(),
        new Promise(resolve => setTimeout(() => resolve({ ok: false, error: 'timeout' }), 5000))
      ])
      results[name] = result
    } catch (e) {
      results[name] = { ok: false, error: e.message }
    }
  })
  await Promise.all(providers)
  return results
}

export { OpencodeGoProvider, OllamaProvider, LLMStudioProvider, ComfyUIProvider, JanusProProvider }
