import wasmExec from './ntfy/wasm_exec.js';
// import fs from 'node:fs'
// import path from "path";
// import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

wasmExec()

let error: any = null
let goStatus = 'beforeload'
let loadNtfyTask = new Promise(async (resolve, reject) => {
  try {
    goStatus = 'loading'
    const go = new Go();
    // const ins = await WebAssembly.instantiate(fs.readFileSync(path.join(process.cwd(), 'public', 'ntfy.wasm')), go.importObject);
    const ins = await WebAssembly.instantiateStreaming(fetch("https://xiaoai.ihave.cool/ntfy.wasm"), go.importObject)
    const { instance } = ins;
    go.run(instance);
    resolve(true)
  } catch (error) {
    reject(error)
  }
})

loadNtfyTask.then(res => {
  goStatus = 'loaded'
}).catch(e => {
  console.error(e);
  error = e
  goStatus = 'error'
})

export default defineEventHandler(async (e) => {
  // const file = path.join(process.cwd(), 'files', 'test.json');
  // const stringified = fs.readFileSync(file, 'utf8');
  const query = getQuery(e)
  const { name } = query
  if (goStatus === 'loaded') {
    return {
      test: globalThis.hello(name),
    }
  } else {
    return {
      goStatus,
      error
    }
  }
})