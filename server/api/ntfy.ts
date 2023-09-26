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
      const ins = await WebAssembly.instantiate(fs.readFileSync('./.output/public/ntfy.wasm'), go.importObject);
      const { instance } = ins;
      go.run(instance);
      resolve(globalThis.hello(name))
    } catch (error) {
      resolve(error)
    }
  })
}

export default defineEventHandler(async (e) => {
  const { name = 'world' } = getQuery(e)
  let res = await loadNtfyTask(name)
  return {
    res,
    dir: fs.readdirSync('./'),
    // test: globalThis.hello('juck'),
    path: [__filename, __dirname, fs.readdirSync(__dirname)]
  }
})