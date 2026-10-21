import initSumWasm from '#server/wasm/sum.wasm?init'

interface SumExports {
  sum: (a: number, b: number) => number
}

export default defineEventHandler(async (event) => {
  const { a = 0, b = 0 } = getQuery(event)
  const wasm = await initSumWasm()
  const { sum } = wasm as unknown as SumExports

  return {
    sum: sum(Number(a), Number(b)),
  }
})
