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
  <div class="flex items-center w-full h-1 rounded-full border border-gray-900 bg-white overflow-hidden">
    <div class="h-full rounded-full bg-gray-900"
      :style="`width: ${percentage}%`"></div>
  </div>
</template>