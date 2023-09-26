// https://nuxt.com/docs/api/configuration/nuxt-config
import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';

// 先构造出.env*文件的绝对路径
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath: string) => path.resolve(appDirectory, relativePath);
const pathsDotenv = resolveApp('.env');
config();
// 按优先级由高到低的顺序加载.env文件
config({ path: `${pathsDotenv}.local` }); // 加载.env.local
config({ path: `${pathsDotenv}.development` }); // 加载.env.development
config({ path: `${pathsDotenv}` }); // 加载.env

export default defineNuxtConfig({
  // extends: [
  //   '../base', // Extend from a local layer
  //   '@my-themes/awesome', // Extend from an installed npm package
  //   'github:my-themes/awesome#v1' // Extend from a git repository
  // ],
  routeRules: {
    // all routes (by default) will be revalidated every 60 seconds, in the background
    '/**': { isr: 60 },
    // this page will be generated on demand and then cached permanently
    '/static': { isr: true },
    // this page is generated at build time and cached permanently
    '/prerendered': { prerender: true },
    // this page will be always fresh
    '/dynamic': { isr: false },
  },
  nitro: {
    experimental: {
      wasm: true
    },
    // preset: 'node-server',
    preset: 'vercel',
    // preset: 'vercel-edge',
    devStorage: {
      // redis: {
      //   driver: 'redis',
      //   port: 6379,
      //   host: '127.0.0.1',
      //   username: '',
      //   password: '',
      //   db: 0,
      //   tls: {}
      // }
    },
    storage: {
      // redis: {
      //   driver: 'redis',
      //   port: 6379,
      //   host: '127.0.0.1',
      //   username: '',
      //   password: '',
      //   db: 0,
      //   tls: {}
      // }
    }
  },
  typescript: {
    shim: false
  },
  runtimeConfig: {
    // The private keys which are only available server-side
    apiSecret: '123',
    mongoDbUrl: process.env.MONGODB_URI,
    atlasDatabase: process.env.ATLAS_DATABASE,
    atlasCollection: process.env.ATLAS_COLLECTION,
    baiduTranslateAppid: process.env.BAIDU_TRANSLATE_APPID,
    baiduTranslateAppsecret: process.env.BAIDU_TRANSLATE_APPSECRET,
    pexelsApikey: process.env.PEXELS_APIKEY,
    pixabayApikey: process.env.PIXABAY_APIKEY,
    openaiApikey: process.env.OPENAI_APIKEY,
    chatGptApiKey: process.env.CHATGPT_APIKEY,
    bingnewApikey: process.env.BINGNEW_APIKEY,
    freeClashSubUrl: process.env.FREE_CLASH_SUB_URL,
    clashSubUrl: process.env.CLASH_SUB_URL,
    clashSubKey: process.env.CLASH_SUB_KEY,
    xiaoAiKeyId: process.env.XIAOAI_KEYID,
    xiaoAiSecret: process.env.XIAOAI_SECRET,
    serverHost: process.env.SERVER_HOST,
    wenxinqianfanAppId: process.env.WENXINQIANFAN_APPID,
    wenxinqianfanAppKey: process.env.WENXINQIANFAN_APPKEY,
    wenxinqianfanAppSecret: process.env.WENXINQIANFAN_APPSECRET,
    sparkAppId: process.env.SPARK_APPID,
    sparkApiKey: process.env.SPARK_APIKEY,
    sparkApiSecret: process.env.SPARK_APISECRET,
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