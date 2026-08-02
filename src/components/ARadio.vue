<script setup>
const props = defineProps({
  id: String,
  name: String,
  value: [String, Number],
})

const model = defineModel()
</script>

<template>
  <label :for="props.id" class="inline-flex justify-center items-center
    border has-[:checked]:border-2 border-gray-900 rounded-lg
    bg-white hover:bg-gray-50 has-[:checked]:bg-gray-200
    px-4 py-2 text-gray-900 hover:text-gray-900 has-[:checked]:text-gray-900">
    
    <input :id="props.id" type="radio" :name="props.name" :value="props.value"
      v-model="model" class="sr-only">
    <slot></slot>
  </label>
</template>