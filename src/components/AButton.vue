<script setup>
const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <button :class="`border rounded-lg px-8 py-2
    ${props.disabled
      ? 'border-gray-400 bg-white text-gray-400 cursor-default'
      : 'border-gray-900 text-gray-900 bg-white hover:bg-gray-900 hover:text-white'}`">
    <slot></slot>
  </button>
</template>