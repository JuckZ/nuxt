import initializeGoRuntime from '#server/vendor/go/wasm_exec.js'

let runtimePromise: Promise<void> | undefined
let requestCount = 0

function loadRuntime(wasmUrl: URL) {
  runtimePromise ??= (async () => {
    initializeGoRuntime()
    const go = new globalThis.Go()
    const response = await fetch(wasmUrl)

    if (!response.ok) {
      throw new Error(`Unable to load ntfy.wasm (${response.status})`)
    }

    const { instance } = await WebAssembly.instantiateStreaming(response, go.importObject)
    void go.run(instance)
  })()

  return runtimePromise
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const name = typeof query.name === 'string' ? query.name : undefined
  const wasmUrl = new URL('/ntfy.wasm', getRequestURL(event))

  await loadRuntime(wasmUrl)
  requestCount += 1

  return {
    requestCount,
    greeting: globalThis.hello?.(name),
  }
})
