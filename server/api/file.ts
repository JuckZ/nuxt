import fs from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async (e) => {
  const query = getQuery(e)
  const { q } = query
  const keyword = q?.toString()
  switch (keyword) {
    case 'dir':
      // 列举所有目录
      return await fs.readdirSync(process.cwd());
    case 'cd':
      return await fs.realpathSync(process.cwd());
    default:
      return await fs.readdirSync(path.resolve(process.cwd(), './' + keyword));
  }
})
