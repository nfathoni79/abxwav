<script setup>
const props = defineProps({
  percentage: {
    type: Number,
    default: 0,
  },
})

const model = defineModel()
</script>

<template>
  <div class="w-full h-2 rounded-full border border-gray-900 bg-white overflow-hidden">
    <div class="h-1 rounded-full border border-gray-900 bg-gray-900 p-0.5"
      :style="`width: ${percentage}%`"></div>
  </div>
</template>