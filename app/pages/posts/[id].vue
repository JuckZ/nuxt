<script setup lang="ts">
const route = useRoute()

const postId = computed(() => {
  const value = route.params.id
  return Array.isArray(value) ? value[0] : value
})

definePageMeta({
  validate(route) {
    const value = route.params.id
    const id = Array.isArray(value) ? value[0] : value
    return typeof id === 'string' && /^\d+$/.test(id)
  },
})
</script>
<template>
  <div>{{ postId }}</div>
</template>
