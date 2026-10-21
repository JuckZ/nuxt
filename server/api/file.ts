import { realpath, readdir } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const query = getQuery(event)
  const keyword = typeof query.q === 'string' ? query.q : 'dir'
  const root = await realpath(process.cwd())

  switch (keyword) {
    case 'dir':
      return readdir(root)
    case 'cd':
      return root
    default: {
      const target = await realpath(resolve(root, keyword))
      const pathFromRoot = relative(root, target)

      if (pathFromRoot.startsWith('..')) {
        throw createError({ statusCode: 403, statusMessage: 'Path escapes the project root' })
      }

      return readdir(target)
    }
  }
})
