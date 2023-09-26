export default defineEventHandler(async (e) => {
  const { name = 'world', pathval = './' } = getQuery(e)
  return {
    path: pathval,
    test: globalThis.hello(name),
  }
})