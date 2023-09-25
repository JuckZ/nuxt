// import ntfyWasmUrl from '@/utils/ntfy/ntfy.wasm?url';


export const loadNtfy = async () => {
    try {
        await import('./wasm_exec.js');
        const go = new Go();
        const response = await fetch('http://localhost:3000/ntfy.wasm');
        const wasmBuffer = await response.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(wasmBuffer, go.importObject);
        await go.run(instance);
    } catch (error) {
        console.error('Error loading WASM:', error);
    }
};