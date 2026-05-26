<template>
  <div class="app">
    <header class="header">
      <h1>🎨 AI Imagen</h1>
      <p>上傳圖片或劇本 · 生成無限制圖片/影片</p>
    </header>
    
    <main class="main">
      <nav class="tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.code"
          :class="['tab-btn', { active: currentTab === tab.code }]"
          @click="currentTab = tab.code"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </nav>
      
      <GeneratePanel v-if="currentTab === 'generate'" />
      <GalleryPanel v-else-if="currentTab === 'gallery'" />
      <VideoJobsPanel v-else-if="currentTab === 'video'" />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import GeneratePanel from './components/GeneratePanel.vue'
import GalleryPanel from './components/GalleryPanel.vue'
import VideoJobsPanel from './components/VideoJobsPanel.vue'

const currentTab = ref('generate')

const tabs = [
  { code: 'generate', label: '生成', icon: '✨' },
  { code: 'gallery', label: '畫廊', icon: '🖼️' },
  { code: 'video', label: '影片任務', icon: '🎬' }
]
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f5f5f5;
  color: #333;
}

.app {
  max-width: 900px;
  margin: 0 auto;
  min-height: 100vh;
}

.header {
  background: linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%);
  color: white;
  padding: 2rem;
  text-align: center;
}

.header h1 {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
}

.header p {
  opacity: 0.9;
  font-size: 0.95rem;
}

.main {
  padding: 1rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tab-btn {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.tab-btn.active {
  border-color: #EC4899;
  background: #fdf2f8;
  font-weight: 600;
}
</style>
