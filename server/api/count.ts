let counter = 0
export default defineEventHandler(() => {
  counter++
  return counter
})
