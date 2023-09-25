import fs from 'node:fs'

const loadNtfy = async () => {
  try {
      await import('./ntfy/wasm_exec.js');
      const go = new Go();
      const { instance } = await WebAssembly.instantiate(fs.readFileSync('public/ntfy.wasm'), go.importObject);
      await go.run(instance);
  } catch (error) {
      console.error('Error loading WASM:', error);
  }
};

loadNtfy()

export default defineEventHandler(async (e) => {
  return {
    test: globalThis.hello('juck')
  }
})