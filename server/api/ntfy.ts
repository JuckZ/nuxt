import fs from 'node:fs'
import { dirname } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loadNtfy = async () => {
  try {
    await import('./ntfy/wasm_exec.js');
    const go = new Go();
    const ins = await WebAssembly.instantiate(fs.readFileSync('server/wasm/ntfy.wasm'), go.importObject);
    const { instance } = ins;
    await go.run(instance);
  } catch (error) {
    console.error('Error loading WASM:', error);
  }
};

loadNtfy()
globalThis.greet = function(name: string) {
  return 'halo ' + name
}
export default defineEventHandler(async (e) => {
  return {
    // test: globalThis.hello('juck'),
    test: globalThis.greet('juck'),
    path: [__filename, __dirname, fs.readdirSync(__dirname)]
  }
})