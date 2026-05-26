<template>
  <div class="mode-selector">
    <button 
      v-for="mode in modes" 
      :key="mode.code"
      :class="['mode-btn', { active: modelValue === mode.code }]"
      @click="$emit('update:modelValue', mode.code)"
    >
      <span class="icon">{{ mode.icon }}</span>
      <span class="label">{{ mode.label }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps(['modelValue'])
defineEmits(['update:modelValue'])

const modes = [
  { code: 'text2img', label: '文生圖', icon: '✨' },
  { code: 'img2img', label: '圖生圖', icon: '🎨' },
  { code: 'video', label: '文生影片', icon: '🎬' }
]
</script>

<style scoped>
.mode-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn.active {
  border-color: #EC4899;
  background: #fdf2f8;
}

.icon {
  font-size: 1.2rem;
}

.label {
  font-weight: 500;
}
</style>
