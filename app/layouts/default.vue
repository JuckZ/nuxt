<template>
  <div>
    <AppHeader />
    <slot />
    <div v-if="$route.params.id">
      <NuxtLink :to="prev">⬅️</NuxtLink> | <NuxtLink :to="next">➡️</NuxtLink>
    </div>
    <AppFooter />
  </div>
</template>
<script setup lang="ts">
const route = useRoute()
const routeId = computed(() => {
  const value = route.params.id
  return Array.isArray(value) ? value[0] : value
})
const id = computed(() => Number(routeId.value ?? 1))
const prev = computed(() => `/${id.value - 1}`)
const next = computed(() => `/${id.value + 1}`)

useHead({
  meta: [{ property: 'og:title', content: `Nuxt AI Playground - ${String(route.meta.title ?? '')}` }],
})
</script>

<style scoped>
div {
  background-color: lightgreen;
}
</style>
