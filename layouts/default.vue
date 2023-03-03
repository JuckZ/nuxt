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
<script setup>
const route = useRoute()
const id = computed(() => Number(route.params.id || 1))
const prev = computed(() => '/' + (id.value - 1))
const next = computed(() => '/' + (id.value + 1))
useHead({
  meta: [{ property: 'og:title', content: `AppName - ${route.meta.title}` }]
})
</script>

<style scoped>
div {
  background-color: lightgreen;
}
</style>
