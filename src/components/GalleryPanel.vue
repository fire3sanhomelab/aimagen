<template>
  <div class="gallery-panel">
    <div class="gallery-header">
      <h3>🖼️ 畫廊</h3>
      <div class="filters">
        <select v-model="sortBy">
          <option value="newest">最新</option>
          <option value="oldest">最舊</option>
        </select>
        <button class="refresh-btn" @click="loadGallery" :disabled="isLoading">
          🔄
        </button>
      </div>
    </div>
    
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>加載中...</p>
    </div>
    
    <div v-else-if="items.length === 0" class="empty">
      <span class="icon">🎨</span>
      <p>暫無生成記錄</p>
      <p class="sub">去「生成」頁面開始創作吧！</p>
    </div>
    
    <div v-else class="gallery-grid">
      <div 
        v-for="item in items" 
        :key="item.id"
        class="gallery-item"
        @click="openDetail(item)"
      >
        <div class="image-wrapper">
          <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.prompt" />
          <div v-else class="no-image">無圖片</div>
        </div>
        <div class="item-info">
          <p class="prompt">{{ truncatePrompt(item.prompt) }}</p>
          <div class="meta">
            <span class="model">{{ item.model }}</span>
            <span class="size">{{ item.width }}×{{ item.height }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="items.length > 0" class="pagination">
      <button 
        :disabled="page <= 1" 
        @click="page--"
      >
        ⬅️ 上一頁
      </button>
      <span>第 {{ page }} 頁</span>
      <button 
        :disabled="items.length < limit" 
        @click="page++"
      >
        下一頁 ➡️
      </button>
    </div>
    
    <!-- Detail Modal -->
    <div v-if="selectedItem" class="modal-overlay" @click="selectedItem = null">
      <div class="modal-content" @click.stop>
        <button class="close-btn" @click="selectedItem = null">✕</button>
        <img v-if="selectedItem.imageUrl" :src="selectedItem.imageUrl" />
        <div class="detail-info">
          <h4>提示詞</h4>
          <p class="full-prompt">{{ selectedItem.prompt }}</p>
          <div class="detail-meta">
            <span>模型: {{ selectedItem.model }}</span>
            <span>尺寸: {{ selectedItem.width }}×{{ selectedItem.height }}</span>
            <span v-if="selectedItem.seed">種子: {{ selectedItem.seed }}</span>
          </div>
          <div class="detail-actions">
            <button @click="downloadImage(selectedItem)">💾 下載</button>
            <button @click="copyPrompt(selectedItem)">📋 複製提示詞</button>
            <button class="danger" @click="deleteItem(selectedItem.id)">🗑️ 刪除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const items = ref([])
const isLoading = ref(false)
const page = ref(1)
const limit = ref(12)
const sortBy = ref('newest')
const selectedItem = ref(null)

async function loadGallery() {
  isLoading.value = true
  try {
    const res = await fetch(`/api/aimagen/gallery?page=${page.value}&limit=${limit.value}`)
    if (res.ok) {
      const data = await res.json()
      items.value = data.items
    }
  } catch (e) {
    console.error('Gallery load failed:', e)
  } finally {
    isLoading.value = false
  }
}

loadGallery()

watch(page, loadGallery)

function truncatePrompt(text) {
  return text?.length > 50 ? text.slice(0, 50) + '...' : text
}

function openDetail(item) {
  selectedItem.value = item
}

function downloadImage(item) {
  if (!item.imageUrl) return
  const a = document.createElement('a')
  a.href = item.imageUrl
  a.download = `aimagen-${item.id}.png`
  a.click()
}

function copyPrompt(item) {
  navigator.clipboard.writeText(item.prompt)
    .then(() => alert('提示詞已複製'))
}

async function deleteItem(id) {
  if (!confirm('確定刪除？')) return
  
  try {
    const res = await fetch(`/api/aimagen/gallery/${id}`, { method: 'DELETE' })
    if (res.ok) {
      items.value = items.value.filter(item => item.id !== id)
      selectedItem.value = null
    }
  } catch (e) {
    console.error('Delete failed:', e)
  }
}
</script>

<style scoped>
.gallery-panel {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.gallery-header h3 {
  color: #EC4899;
}

.filters {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.filters select {
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.refresh-btn {
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  cursor: pointer;
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

.sub {
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.gallery-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
}

.gallery-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.image-wrapper {
  aspect-ratio: 1;
  background: #f3f4f6;
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

.item-info {
  padding: 0.75rem;
}

.item-info .prompt {
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
  color: #374151;
}

.meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #9ca3af;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.pagination button {
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.modal-content img {
  width: 100%;
  max-height: 500px;
  object-fit: contain;
  background: #1f2937;
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.5);
  color: white;
  cursor: pointer;
  font-size: 1rem;
}

.detail-info {
  padding: 1.5rem;
}

.detail-info h4 {
  margin-bottom: 0.5rem;
  color: #374151;
}

.full-prompt {
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.detail-meta span {
  padding: 0.25rem 0.5rem;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 0.85rem;
}

.detail-actions {
  display: flex;
  gap: 0.5rem;
}

.detail-actions button {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
}

.detail-actions button.danger {
  color: #ef4444;
}
</style>
