import fs from 'node:fs'
import { dirname } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let loadNtfyTask = (name: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      await import('./ntfy/wasm_exec.js');
      const go = new Go();
      const ins = await WebAssembly.instantiate(fs.readFileSync('server/wasm/ntfy.wasm'), go.importObject);
      const { instance } = ins;
      go.run(instance);
      resolve(globalThis.hello(name))
    } catch (error) {
      resolve(error)
    }
  })
}

let timeoutTask = new Promise((resolve, reject) => {
  let t1 = setTimeout(() => {
    resolve('timeout')
    clearTimeout(t1)
  }, 2000);
})
export default defineEventHandler(async (e) => {
  const { name = 'world' } = getQuery(e)
  let res = await Promise.race([loadNtfyTask(name), timeoutTask])
  return {
    res,
    // test: globalThis.hello('juck'),
    path: [__filename, __dirname, fs.readdirSync(__dirname)]
  }
})