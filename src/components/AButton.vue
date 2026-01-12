<script setup>
const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <button :disabled="props.disabled" :class="`border rounded-lg px-8 py-2
    ${props.disabled
      ? 'border-gray-400 bg-white text-gray-400 cursor-default'
      : 'border-gray-900 text-white bg-gray-900 hover:bg-gray-800 hover:text-white'}`">
    <slot></slot>
  </button>
</template>