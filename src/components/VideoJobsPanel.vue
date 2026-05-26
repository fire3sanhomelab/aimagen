<template>
  <div class="video-jobs-panel">
    <h3>🎬 影片任務</h3>
    <p class="desc">查看影片生成進度同已完成的影片</p>
    
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>加載中...</p>
    </div>
    
    <div v-else-if="jobs.length === 0" class="empty">
      <span class="icon">🎬</span>
      <p>暫無影片任務</p>
      <p class="sub">去「生成」頁面創建影片任務！</p>
    </div>
    
    <div v-else class="jobs-list">
      <div 
        v-for="job in sortedJobs" 
        :key="job.id"
        :class="['job-card', job.status]"
      >
        <div class="job-header">
          <span class="job-id">#{{ job.id.slice(0, 8) }}</span>
          <span :class="['status-badge', job.status]">
            {{ statusText(job.status) }}
          </span>
        </div>
        
        <p class="job-prompt">{{ truncatePrompt(job.prompt) }}</p>
        
        <div class="job-meta">
          <span>⏱️ {{ job.duration }}秒</span>
          <span>🎞️ {{ job.fps }} FPS</span>
          <span>📅 {{ formatDate(job.createdAt) }}</span>
        </div>
        
        <div v-if="job.status === 'processing'" class="progress-bar">
          <div class="progress-fill" :style="{ width: job.progress + '%' }"></div>
          <span>{{ job.progress }}%</span>
        </div>
        
        <div v-if="job.status === 'completed' && job.videoUrl" class="job-actions">
          <a :href="job.videoUrl" target="_blank" class="view-btn">▶️ 播放</a>
          <a :href="job.videoUrl" download class="download-btn">💾 下載</a>
        </div>
        
        <div v-if="job.status === 'failed'" class="error-msg">
          ❌ 生成失敗
        </div>
      </div>
    </div>
    
    <button class="refresh-btn" @click="loadJobs" :disabled="isLoading">
      🔄 刷新
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const jobs = ref([])
const isLoading = ref(false)

const sortedJobs = computed(() => {
  return [...jobs.value].sort((a, b) => b.createdAt - a.createdAt)
})

async function loadJobs() {
  isLoading.value = true
  try {
    // Load from localStorage for demo
    const saved = localStorage.getItem('video-jobs')
    if (saved) {
      jobs.value = JSON.parse(saved)
    }
    
    // Also try to poll status from backend
    for (const job of jobs.value) {
      if (job.status === 'queued' || job.status === 'processing') {
        await pollJobStatus(job.id)
      }
    }
  } catch (e) {
    console.error('Load jobs failed:', e)
  } finally {
    isLoading.value = false
  }
}

async function pollJobStatus(jobId) {
  try {
    const res = await fetch(`/api/aimagen/jobs/${jobId}`)
    if (res.ok) {
      const data = await res.json()
      const idx = jobs.value.findIndex(j => j.id === jobId)
      if (idx >= 0) {
        jobs.value[idx] = { ...jobs.value[idx], ...data.job }
        saveJobs()
      }
    }
  } catch (e) {
    console.error('Poll failed:', e)
  }
}

function saveJobs() {
  localStorage.setItem('video-jobs', JSON.stringify(jobs.value))
}

function statusText(status) {
  const texts = {
    queued: '排隊中',
    processing: '處理中',
    completed: '已完成',
    failed: '失敗'
  }
  return texts[status] || status
}

function truncatePrompt(text) {
  return text?.length > 100 ? text.slice(0, 100) + '...' : text
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('zh-HK')
}

loadJobs()

// Poll every 30 seconds
setInterval(() => {
  const processing = jobs.value.filter(j => j.status === 'queued' || j.status === 'processing')
  if (processing.length > 0) {
    loadJobs()
  }
}, 30000)
</script>

<style scoped>
.video-jobs-panel {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.video-jobs-panel h3 {
  color: #EC4899;
  margin-bottom: 0.25rem;
}

.desc {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.loading,
.empty {
  text-align: center;
  padding: 3rem 1rem;
  color: #9ca3af;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #EC4899;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty .icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.jobs-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.job-card {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
}

.job-card.processing {
  border-color: #fbbf24;
  background: #fffbeb;
}

.job-card.completed {
  border-color: #22c55e;
}

.job-card.failed {
  border-color: #ef4444;
  background: #fef2f2;
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.job-id {
  font-family: monospace;
  font-size: 0.85rem;
  color: #9ca3af;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.queued {
  background: #e5e7eb;
  color: #374151;
}

.status-badge.processing {
  background: #fef3c7;
  color: '#92400e';
}

.status-badge.completed {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.failed {
  background: #fee2e2;
  color: #991b1b;
}

.job-prompt {
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.job-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
}

.progress-bar {
  height: 24px;
  background: #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #EC4899, #8B5CF6);
  transition: width 0.5s;
}

.progress-bar span {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.job-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.job-actions a {
  flex: 1;
  padding: 0.5rem;
  text-align: center;
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.9rem;
}

.view-btn {
  background: #4F46E5;
  color: white;
}

.download-btn {
  background: #f3f4f6;
  color: #374151;
}

.error-msg {
  color: #ef4444;
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.refresh-btn {
  width: 100%;
  margin-top: 1rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
}
</style>
