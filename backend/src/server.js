import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { getProvider, listProviders, healthCheckAll } from './providers/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { validate } from './middleware/validate.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.join(__dirname, '..')

// ===== CONFIG =====
const PORT = process.env.PORT || 3456
const AI_PROVIDER = process.env.AI_IMAGE_PROVIDER || 'opencode-go'

// ===== APP SETUP =====
const app = express()

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use('/uploads', express.static(path.join(ROOT, 'uploads')))
app.use('/gallery', express.static(path.join(ROOT, 'public/gallery')))

// Ensure dirs exist
await fs.mkdir(path.join(ROOT, 'uploads'), { recursive: true })
await fs.mkdir(path.join(ROOT, 'public/gallery'), { recursive: true })
await fs.mkdir(path.join(ROOT, 'data'), { recursive: true })

// ===== MULTER =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(ROOT, 'uploads')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
})
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } })

// ===== DATA HELPERS =====
async function readData(file) {
  try {
    const raw = await fs.readFile(path.join(ROOT, 'data', file), 'utf8')
    return JSON.parse(raw)
  } catch { return [] }
}

async function writeData(file, data) {
  await fs.writeFile(path.join(ROOT, 'data', file), JSON.stringify(data, null, 2))
}

/**
 * Sanitize user prompt to prevent injection before passing to providers.
 * Truncates to 2000 chars — most image gen models have prompt length limits.
 */
function sanitizePrompt(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')  // strip control chars
    .slice(0, 2000)
}

// ===== HEALTH =====
app.get('/api/health', async (req, res) => {
  const providerHealth = await healthCheckAll()
  res.json({
    status: 'ok',
    service: 'aimagen',
    version: '1.0.0',
    activeProvider: AI_PROVIDER,
    providers: providerHealth,
    time: new Date().toISOString()
  })
})

// ===== PROVIDER MANAGEMENT =====
app.get('/api/providers', (req, res) => {
  res.json({
    active: AI_PROVIDER,
    available: listProviders()
  })
})

app.get('/api/providers/:name/models', async (req, res) => {
  try {
    const provider = getProvider(req.params.name)
    const models = await provider.getModels()
    res.json({ provider: req.params.name, models })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// ===== GENERATE IMAGE =====
app.post('/api/generate', validate(['prompt']), async (req, res) => {
  const {
    prompt: rawPrompt,
    negativePrompt: rawNegPrompt = '',
    width = 512,
    height = 512,
    seed,
    model,
    provider: providerName
  } = req.body

  const prompt = sanitizePrompt(rawPrompt)
  const negativePrompt = sanitizePrompt(rawNegPrompt)

  if (!prompt) {
    const err = new Error('Prompt is required and must be non-empty')
    err.status = 400
    err.expose = true
    throw err
  }

  try {
    const provider = getProvider(providerName)
    const result = await provider.generate({ prompt, negativePrompt, width, height, seed, model })

    // Save to gallery
    const gallery = await readData('gallery.json')
    const item = {
      id: uuidv4(),
      prompt,
      negativePrompt,
      width,
      height,
      seed,
      model: result.model || model,
      provider: result.provider,
      imageUrl: result.imageUrl,
      imageBase64: result.imageBase64,
      createdAt: Date.now()
    }
    gallery.unshift(item)
    if (gallery.length > 200) gallery.pop()
    await writeData('gallery.json', gallery)

    res.json({ success: true, ...item })
  } catch (e) {
    console.error('Generation failed:', e.message)
    res.status(503).json({ error: e.message, provider: providerName || AI_PROVIDER })
  }
})

// ===== GENERATE VIDEO =====
app.post('/api/generate-video', validate(['prompt']), async (req, res) => {
  const { prompt, duration = 5, fps = 24, provider: providerName } = req.body

  const jobs = await readData('video-jobs.json')
  const job = {
    id: uuidv4(),
    prompt,
    duration,
    fps,
    provider: providerName || AI_PROVIDER,
    status: 'queued',
    progress: 0,
    createdAt: Date.now()
  }
  jobs.push(job)
  await writeData('video-jobs.json', jobs)

  // Placeholder: actual video gen would use a provider that supports it
  processVideoJob(job)

  res.json({ success: true, job })
})

async function processVideoJob(job) {
  await new Promise(r => setTimeout(r, 30000))

  const jobs = await readData('video-jobs.json')
  const idx = jobs.findIndex(j => j.id === job.id)
  if (idx >= 0) {
    jobs[idx].status = 'completed'
    jobs[idx].progress = 100
    jobs[idx].videoUrl = '/gallery/placeholder-video.mp4'
    await writeData('video-jobs.json', jobs)
  }
}

// ===== GALLERY =====
app.get('/api/gallery', async (req, res) => {
  const { page = 1, limit = 20 } = req.query
  const gallery = await readData('gallery.json')
  const start = (page - 1) * limit
  const items = gallery.slice(start, start + parseInt(limit))
  res.json({ items, total: gallery.length, page: parseInt(page) })
})

app.delete('/api/gallery/:id', async (req, res) => {
  const gallery = await readData('gallery.json')
  const filtered = gallery.filter(item => item.id !== req.params.id)
  await writeData('gallery.json', filtered)
  res.json({ success: true })
})

// ===== UPLOAD REFERENCE =====
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' })

  const url = `/uploads/${path.basename(req.file.path)}`
  res.json({ success: true, url, filename: req.file.filename })
})

// ===== IMAGE-TO-IMAGE =====
app.post('/api/img2img', upload.single('image'), validate(['prompt']), async (req, res) => {
  const { prompt, strength = 0.75, provider: providerName } = req.body

  if (!req.file) return res.status(400).json({ error: 'No image uploaded' })

  try {
    // Read uploaded image as base64
    const imageBuffer = await fs.readFile(req.file.path)
    const imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`

    const provider = getProvider(providerName)
    const result = await provider.img2img({ imageBase64, prompt, strength: parseFloat(strength) })

    res.json({ success: true, imageUrl: result.imageUrl, imageBase64: result.imageBase64 })
  } catch (e) {
    console.error('Img2img failed:', e.message)
    res.status(503).json({ error: e.message })
  }
})

// ===== JOB STATUS =====
app.get('/api/jobs/:id', async (req, res) => {
  const jobs = await readData('video-jobs.json')
  const job = jobs.find(j => j.id === req.params.id)
  if (!job) return res.status(404).json({ error: 'Job not found' })
  res.json({ job })
})

// ===== STATS =====
app.get('/api/stats', async (req, res) => {
  const gallery = await readData('gallery.json')
  const providerCounts = gallery.reduce((acc, item) => {
    acc[item.provider] = (acc[item.provider] || 0) + 1
    return acc
  }, {})

  res.json({
    totalImages: gallery.length,
    byProvider: providerCounts,
    activeProvider: AI_PROVIDER
  })
})

// ===== ERROR HANDLER (must be last) =====
app.use(errorHandler)

// ===== START =====
app.listen(PORT, () => {
  console.log(`🚀 aimagen backend running on port ${PORT}`)
  console.log(`🎨 Active provider: ${AI_PROVIDER}`)
  console.log(`🔄 Available: opencode-go, ollama, llm-studio, comfyui, janus-pro`)
  console.log(`📋 Switch provider: AI_IMAGE_PROVIDER=<name> or POST /api/generate { provider: '<name>' }`)
})
