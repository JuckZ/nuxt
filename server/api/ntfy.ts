import fs from 'node:fs'
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let loadNtfyTask = (name: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      await import('./ntfy/wasm_exec.js');
      const go = new Go();
      // const ins = await WebAssembly.instantiate(fs.readFileSync(path.join(process.cwd(), 'public', 'ntfy.wasm')), go.importObject);
      const res = await fetch("https://xiaoai.ihave.cool/ntfy.wasm")
      const ins = await WebAssembly.instantiateStreaming(res, go.importObject)
      const { instance } = ins;
      go.run(instance);
      resolve(globalThis.hello(name))
    } catch (error) {
      resolve(error)
    }
  })
}

export default defineEventHandler(async (e) => {
  const { name = 'world', pathval = './' } = getQuery(e)
  // const file = path.join(process.cwd(), 'files', 'test.json');
  // const stringified = fs.readFileSync(file, 'utf8');
  let res = await loadNtfyTask(name)
  return {
    res,
    path: pathval,
    dir: fs.readdirSync(pathval),
    dirname: __dirname,
    filename: __filename
    // test: globalThis.hello('juck'),
  }
})