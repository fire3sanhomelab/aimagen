<template>
  <div class="generate-panel">
    <ModeSelector v-model="currentMode" />
    
    <div v-if="currentMode === 'text2img'" class="generate-form">
      <div class="prompt-section">
        <label>提示詞 (Prompt)</label>
        <textarea 
          v-model="prompt"
          rows="3"
          placeholder="描述你想生成嘅圖片..."
        ></textarea>
      </div>
      
      <div class="prompt-section">
        <label>反向提示詞 (Negative Prompt)</label>
        <textarea 
          v-model="negativePrompt"
          rows="2"
          placeholder="描述你唔想要嘅元素..."
        ></textarea>
      </div>
      
      <div class="settings-row">
        <div class="setting">
          <label>尺寸</label>
          <select v-model="size">
            <option value="512x512">512 × 512</option>
            <option value="768x512">768 × 512</option>
            <option value="512x768">512 × 768</option>
            <option value="1024x1024">1024 × 1024</option>
          </select>
        </div>
        
        <div class="setting">
          <label>數量</label>
          <input type="number" v-model.number="count" min="1" max="4" />
        </div>
        
        <div class="setting">
          <label>種子 (Seed)</label>
          <input type="number" v-model.number="seed" placeholder="隨機" />
        </div>
      </div>
      
      <button 
        class="generate-btn"
        :disabled="!prompt.trim() || isGenerating"
        @click="generate"
      >
        <span v-if="isGenerating" class="spinner"></span>
        <span v-else>✨ 生成圖片</span>
      </button>
    </div>
    
    <div v-else-if="currentMode === 'img2img'" class="generate-form">
      <div class="upload-section">
        <div 
          class="drop-zone"
          :class="{ dragging: isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop.prevent="handleDrop"
          @click="$refs.fileInput.click()"
        >
          <input 
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="handleFileSelect"
            hidden
          />
          <div v-if="!previewUrl" class="placeholder">
            <span class="icon">📁</span>
            <p>拖放上傳參考圖</p>
          </div>
          <img v-else :src="previewUrl" class="preview" />
        </div>
      </div>
      
      <div class="prompt-section">
        <label>提示詞</label>
        <textarea v-model="prompt" rows="2" placeholder="描述想要嘅效果..."></textarea>
      </div>
      
      <div class="setting">
        <label>強度 (Strength)</label>
        <input type="range" v-model.number="strength" min="0" max="1" step="0.05" />
        <span>{{ strength }}</span>
      </div>
      
      <button 
        class="generate-btn"
        :disabled="!prompt.trim() || !selectedFile || isGenerating"
        @click="generateImg2Img"
      >
        <span v-if="isGenerating" class="spinner"></span>
        <span v-else>🎨 圖生圖</span>
      </button>
    </div>
    
    <div v-else-if="currentMode === 'video'" class="generate-form">
      <div class="prompt-section">
        <label>影片描述</label>
        <textarea 
          v-model="videoPrompt"
          rows="4"
          placeholder="描述你想要嘅影片場景、動作、風格..."
        ></textarea>
      </div>
      
      <div class="settings-row">
        <div class="setting">
          <label>時長 (秒)</label>
          <select v-model.number="videoDuration">
            <option :value="5">5 秒</option>
            <option :value="10">10 秒</option>
          </select>
        </div>
        <div class="setting">
          <label>幀率</label>
          <select v-model.number="videoFps">
            <option :value="24">24 FPS</option>
            <option :value="30">30 FPS</option>
          </select>
        </div>
      </div>
      
      <button 
        class="generate-btn video"
        :disabled="!videoPrompt.trim() || isGenerating"
        @click="generateVideo"
      >
        <span v-if="isGenerating" class="spinner"></span>
        <span v-else>🎬 生成影片</span>
      </button>
    </div>
    
    <!-- Results -->
    <div v-if="results.length > 0" class="results">
      <h4>生成結果</h4>
      <div class="results-grid">
        <div 
          v-for="result in results" 
          :key="result.id"
          class="result-card"
        >
          <img v-if="result.imageUrl" :src="result.imageUrl" :alt="result.prompt" />
          <div v-else-if="result.videoUrl" class="video-placeholder">
            <span>🎬</span>
            <p>影片生成中...</p>
          </div>
          <div class="result-info">
            <p class="prompt">{{ truncatePrompt(result.prompt) }}</p>
            <div class="actions">
              <button @click="downloadImage(result)">💾</button>
              <button @click="copyPrompt(result)">📋</button>
              <button @click="deleteResult(result.id)">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ModeSelector from './ModeSelector.vue'

const currentMode = ref('text2img')
const prompt = ref('')
const negativePrompt = ref('')
const size = ref('512x512')
const count = ref(1)
const seed = ref('')
const strength = ref(0.75)
const isGenerating = ref(false)
const results = ref([])

const isDragging = ref(false)
const previewUrl = ref('')
const selectedFile = ref(null)

const videoPrompt = ref('')
const videoDuration = ref(5)
const videoFps = ref(24)

async function generate() {
  if (!prompt.value.trim()) return
  isGenerating.value = true
  
  try {
    const [width, height] = size.value.split('x').map(Number)
    
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt.value,
        negativePrompt: negativePrompt.value,
        width,
        height,
        seed: seed.value ? parseInt(seed.value) : undefined,
        model: 'opencode-go/kimi-k2.6'
      })
    })
    
    if (res.ok) {
      const data = await res.json()
      results.value.unshift(data)
    } else {
      throw new Error('Generation failed')
    }
  } catch (e) {
    console.error('Generate error:', e)
    alert('生成失敗，請檢查後端服務')
  } finally {
    isGenerating.value = false
  }
}

async function generateImg2Img() {
  if (!prompt.value.trim() || !selectedFile.value) return
  isGenerating.value = true
  
  const formData = new FormData()
  formData.append('image', selectedFile.value)
  formData.append('prompt', prompt.value)
  formData.append('strength', strength.value)
  
  try {
    const res = await fetch('/api/img2img', {
      method: 'POST',
      body: formData
    })
    
    if (res.ok) {
      const data = await res.json()
      results.value.unshift({
        id: Date.now(),
        prompt: prompt.value,
        imageUrl: data.imageUrl,
        createdAt: Date.now()
      })
    }
  } catch (e) {
    console.error('Img2img error:', e)
    alert('圖生圖失敗')
  } finally {
    isGenerating.value = false
  }
}

async function generateVideo() {
  if (!videoPrompt.value.trim()) return
  isGenerating.value = true
  
  try {
    const res = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: videoPrompt.value,
        duration: videoDuration.value,
        fps: videoFps.value
      })
    })
    
    if (res.ok) {
      const data = await res.json()
      results.value.unshift({
        id: data.job.id,
        prompt: videoPrompt.value,
        videoUrl: null,
        status: 'processing',
        createdAt: Date.now()
      })
      alert(`影片任務已創建！ID: ${data.job.id}`)
    }
  } catch (e) {
    console.error('Video error:', e)
    alert('影片生成失敗')
  } finally {
    isGenerating.value = false
  }
}

function handleFileSelect(e) {
  const file = e.target.files[0]
  if (file) setFile(file)
}

function handleDrop(e) {
  isDragging.value = false
  const file = e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    setFile(file)
  }
}

function setFile(file) {
  selectedFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => { previewUrl.value = e.target.result }
  reader.readAsDataURL(file)
}

function truncatePrompt(text) {
  return text?.length > 60 ? text.slice(0, 60) + '...' : text
}

function downloadImage(result) {
  if (!result.imageUrl) return
  const a = document.createElement('a')
  a.href = result.imageUrl
  a.download = `aimagen-${result.id}.png`
  a.click()
}

function copyPrompt(result) {
  navigator.clipboard.writeText(result.prompt)
    .then(() => alert('提示詞已複製'))
}

function deleteResult(id) {
  results.value = results.value.filter(r => r.id !== id)
}
</script>

<style scoped>
.generate-panel {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.generate-form {
  margin-top: 1rem;
}

.prompt-section {
  margin-bottom: 1rem;
}

.prompt-section label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.prompt-section textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  resize: vertical;
  font-family: inherit;
}

.settings-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.setting {
  flex: 1;
}

.setting label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.85rem;
  color: #6b7280;
}

.setting select,
.setting input[type="number"] {
  width: 100%;
  padding: 0.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
}

.setting input[type="range"] {
  width: 80%;
}

.generate-btn {
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #EC4899, #8B5CF6);
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.generate-btn.video {
  background: linear-gradient(135deg, #8B5CF6, #4F46E5);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Upload */
.upload-section {
  margin-bottom: 1rem;
}

.drop-zone {
  border: 3px dashed #e5e7eb;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-zone.dragging {
  border-color: #EC4899;
  background: #fdf2f8;
}

.placeholder .icon {
  font-size: 3rem;
}

.preview {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
}

/* Results */
.results {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.results h4 {
  margin-bottom: 1rem;
  color: #374151;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.result-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.result-card img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.video-placeholder {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  color: #6b7280;
}

.result-info {
  padding: 0.75rem;
}

.result-info .prompt {
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
  color: #374151;
}

.actions {
  display: flex;
  gap: 0.25rem;
}

.actions button {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}
</style>
