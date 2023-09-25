import { loadNtfy } from '@/server/util/ntfy/notify';

export default defineNitroPlugin(async (nitroApp) => {
  // console.log('Nitro plugin', nitroApp)
  await loadNtfy();
  console.log('Nitro plugin')
})
