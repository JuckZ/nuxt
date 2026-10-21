<template>
  <section>
    <p>This page will be displayed at the /about route.</p>
  </section>
</template>
<script setup lang="ts">
definePageMeta({
  layout: 'orange',
  // pageTransition: { name: 'rotate' }
  // layoutTransition: { name: 'slide-in' }
})
useHead({
  title: 'About'
})
</script>
