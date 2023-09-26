import wasmExec from './ntfy/wasm_exec.js';
// import fs from 'node:fs'
// import path from "path";
// import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

export default defineNitroPlugin(async (nitroApp) => {
  // const file = path.join(process.cwd(), 'files', 'test.json');
  // const stringified = fs.readFileSync(file, 'utf8');
  wasmExec()
  let loadNtfyTask = () => new Promise(async (resolve, reject) => {
    try {
      const go = new Go();
      // const ins = await WebAssembly.instantiate(fs.readFileSync(path.join(process.cwd(), 'public', 'ntfy.wasm')), go.importObject);
      const ins = await WebAssembly.instantiateStreaming(fetch("https://xiaoai.ihave.cool/ntfy.wasm"), go.importObject)
      const { instance } = ins;
      go.run(instance);
      resolve(globalThis.hello('test'))
    } catch (error) {
      resolve(error)
    }
  })
  loadNtfyTask().then(res => {
    console.log(res);
  }).catch(e => {
    console.error(e);
  })
})
