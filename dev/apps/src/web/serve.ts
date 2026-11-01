import { join, normalize } from 'node:path'

const port = Number(process.env.PORT ?? 5173)
const apiUrl = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const distDir = join(import.meta.dir, 'dist')

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url)

    // /api はAPIへ転送する
    if (url.pathname.startsWith('/api')) {
      try {
        return await fetch(new Request(apiUrl + url.pathname + url.search, req))
      } catch {
        return new Response('APIに接続できません', { status: 502 })
      }
    }

    // dist/ の外を読まないようにパスを正規化する
    const rel = normalize(url.pathname).replace(/^([/\\])+/, '')
    const file = Bun.file(join(distDir, rel))
    // 実在するファイルならそれを返し、無ければ画面の入口（index.html）を返す
    if (rel !== '' && !rel.startsWith('..') && (await file.exists())) return new Response(file)
    return new Response(Bun.file(join(distDir, 'index.html')))
  },
})
console.log(`web: http://localhost:${port} (API: ${apiUrl})`)
