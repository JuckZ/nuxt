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
  nitro: {
    preset: 'vercel-edge',
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
