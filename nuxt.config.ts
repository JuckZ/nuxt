// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // extends: [
  //   '../base', // Extend from a local layer
  //   '@my-themes/awesome', // Extend from an installed npm package
  //   'github:my-themes/awesome#v1' // Extend from a git repository
  // ],
  nitro: {
    preset: 'vercel-edge'
  },
  typescript: {
    shim: false
  },
  runtimeConfig: {
    // The private keys which are only available server-side
    apiSecret: '123',
    // Keys within public are also exposed client-side
    public: { apiBase: '/api' }
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/assets/_colors.scss" as *;'
        }
      }
    }
  },
  app: {
    pageTransition: { name: 'fade', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
    head: {
      charset: 'utf-16',
      viewport: 'width=500, initial-scale=1',
      title: 'My App',
      meta: [
        // <meta name="description" content="My amazing site">
        { name: 'description', content: 'My amazing site.' }
      ]
    }
  },
  appConfig: {
    title: 'Hello Juck',
    theme: {
      dark: true,
      colors: {
        primary: '#ff0000'
      }
    }
  }
})
