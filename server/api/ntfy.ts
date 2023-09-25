
export default defineEventHandler(async (e) => {
  return {
    test: globalThis.hello('juck')
  }
})