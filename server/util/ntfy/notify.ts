import fs from 'node:fs'

export const loadNtfy = async () => {
    try {
        await import('./wasm_exec.js');
        const go = new Go();
        const { instance } = await WebAssembly.instantiate(fs.readFileSync('public/ntfy.wasm'), go.importObject);
        await go.run(instance);
    } catch (error) {
        console.error('Error loading WASM:', error);
    }
};