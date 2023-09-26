import wasmExec from './ntfy/wasm_exec.js';
// import fs from 'node:fs'
// import path from "path";
// import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

wasmExec()

let res: any = undefined
let loadNtfyTask = () => new Promise(async (resolve, reject) => {
  try {
    const go = new Go();
    // const ins = await WebAssembly.instantiate(fs.readFileSync(path.join(process.cwd(), 'public', 'ntfy.wasm')), go.importObject);
    const ins = await WebAssembly.instantiateStreaming(fetch("https://xiaoai.ihave.cool/ntfy.wasm"), go.importObject)
    const { instance } = ins;
    go.run(instance);
    res = globalThis.hello('test')
    resolve(res)
  } catch (error) {
    res = error
    resolve(error)
  }
})

export default defineEventHandler(async (e) => {
  // const file = path.join(process.cwd(), 'files', 'test.json');
  // const stringified = fs.readFileSync(file, 'utf8');
  const { name = 'world', pathval = './' } = getQuery(e)
  await loadNtfyTask()
  return {
    res,
    path: pathval,
    test: globalThis.hello(name),
  }
})