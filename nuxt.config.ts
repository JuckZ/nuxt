export default defineNuxtConfig({
  compatibilityDate: '2026-09-21',

  devtools: { enabled: true },

  modules: ['@nuxt/eslint'],

  nitro: {
    experimental: {
      wasm: true,
    },
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  runtimeConfig: {
    aiGatewayBaseUrl: 'http://127.0.0.1:4000/v1',
    aiGatewayApiKey: '',
    aiModelChatFast: 'chat-fast',
    aiModelChatQuality: 'chat-quality',
    aiModelReasoning: 'reasoning',

    baiduTranslateAppId: '',
    baiduTranslateAppSecret: '',
    pexelsApiKey: '',
    pixabayApiKey: '',

    freeClashSubUrl: '',
    clashSubUrl: '',
    clashSubKey: '',
    clashSourcesFile: './clash.config.yaml',

    xiaoAiKeyId: '',
    xiaoAiSecret: '',
    serverHost: '',

    public: {
      apiBase: '/api',
    },
  },

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/_colors.scss" as *;',
        },
      },
    },
  },

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'Nuxt AI Playground',
      meta: [
        {
          name: 'description',
          content: 'A modern Nuxt playground for AI, voice assistant and WebAssembly integrations.',
        },
      ],
    },
  },

  appConfig: {
    title: 'Nuxt AI Playground',
    theme: {
      dark: true,
      colors: {
        primary: '#ff0000',
      },
    },
  },
})
