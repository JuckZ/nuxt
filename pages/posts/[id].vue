<script setup>
const route = useRoute()

// When accessing /posts/1, route.params.id will be 1
const postId = route.params.id
definePageMeta({
  validate: async (route) => {
    // Check if the id is made up of digits
    return /^\d+$/.test(route.params.id)
  }
})
</script>
<template>
  <div>{{ postId }}</div>
</template>
