import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import fetch from 'node-fetch'
import { createServer } from 'http'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.join(__dirname, '..')

// ===== CONFIG =====
const PORT = process.env.PORT || 3456
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const LLM_STUDIO_URL = process.env.LLM_STUDIO_URL || 'http://192.168.1.100:1234'

// ===== APP SETUP =====
const app = express()
const server = createServer(app)

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

// ===== HEALTH =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'aimagen', version: '1.0.0', time: new Date().toISOString() })
})

// ===== GENERATE IMAGE =====
app.post('/api/generate', async (req, res) => {
  const { prompt, negativePrompt = '', width = 512, height = 512, seed, model } = req.body

  const endpoints = [
    {
      name: 'ollama-image',
      url: `${OLLAMA_URL}/api/generate`,
      body: {
        model: model || 'opencode-go/kimi-k2.6',
        prompt,
        images: [],
        stream: false
      }
    },
    {
      name: 'llm-studio',
      url: `${LLM_STUDIO_URL}/v1/images/generations`,
      body: {
        prompt,
        n: 1,
        size: `${width}x${height}`,
        ...(seed && { seed })
      }
    }
  ]

  for (const ep of endpoints) {
    try {
      const response = await fetch(ep.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ep.body)
      })

      if (response.ok) {
        const data = await response.json()

        // Save to gallery
        const gallery = await readData('gallery.json')
        const item = {
          id: uuidv4(),
          prompt,
          negativePrompt,
          width,
          height,
          seed,
          model: ep.name,
          imageUrl: data.images?.[0]?.url || data.image,
          createdAt: Date.now()
        }
        gallery.unshift(item)
        if (gallery.length > 200) gallery.pop()
        await writeData('gallery.json', gallery)

        return res.json({ success: true, ...item })
      }
    } catch (e) {
      console.warn(`${ep.name} failed:`, e.message)
    }
  }

  res.status(503).json({ error: 'All generation endpoints unavailable' })
})

// ===== GENERATE VIDEO =====
app.post('/api/generate-video', async (req, res) => {
  const { prompt, duration = 5, fps = 24 } = req.body

  const jobs = await readData('video-jobs.json')
  const job = {
    id: uuidv4(),
    prompt,
    duration,
    fps,
    status: 'queued',
    progress: 0,
    createdAt: Date.now()
  }
  jobs.push(job)
  await writeData('video-jobs.json', jobs)

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
app.post('/api/img2img', upload.single('image'), async (req, res) => {
  const { prompt, strength = 0.75 } = req.body

  if (!req.file) return res.status(400).json({ error: 'No image uploaded' })

  try {
    const imageBuffer = await fs.readFile(req.file.path)
    const base64Image = imageBuffer.toString('base64')

    const response = await fetch(`${LLM_STUDIO_URL}/v1/images/edits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: `data:image/png;base64,${base64Image}`,
        prompt,
        strength: parseFloat(strength)
      })
    })

    if (response.ok) {
      const data = await response.json()
      return res.json({ success: true, imageUrl: data.data?.[0]?.url })
    }
  } catch (e) {
    console.error('Img2img failed:', e.message)
  }

  res.status(503).json({ error: 'Image-to-image generation failed' })
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
  res.json({ totalImages: gallery.length })
})

// ===== START =====
server.listen(PORT, () => {
  console.log(`🚀 aimagen backend running on port ${PORT}`)
  console.log(`🤖 Ollama: ${OLLAMA_URL}`)
  console.log(`🖥️  LLM Studio: ${LLM_STUDIO_URL}`)
})
