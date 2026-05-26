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
 * Check health of all providers
 */
export async function healthCheckAll() {
  const results = {}
  for (const [name, ProviderClass] of Object.entries(providerRegistry)) {
    const instance = new ProviderClass()
    results[name] = await instance.healthCheck()
  }
  return results
}

export { OpencodeGoProvider, OllamaProvider, LLMStudioProvider, ComfyUIProvider, JanusProProvider }
