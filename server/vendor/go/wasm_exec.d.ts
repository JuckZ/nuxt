interface GoRuntime {
  importObject: WebAssembly.Imports
  run(instance: WebAssembly.Instance): Promise<void>
}

declare global {
  var Go: new () => GoRuntime
  var hello: ((name?: string) => string) | undefined
}

declare const initializeGoRuntime: () => void

export default initializeGoRuntime
