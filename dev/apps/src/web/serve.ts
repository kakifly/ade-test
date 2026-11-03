import { join, normalize } from 'node:path'

/** 待ち受けポート。環境変数 PORT、無ければ 5173 */
const port = Number(process.env.PORT ?? 5173)
/** 転送先のAPIのURL（末尾のスラッシュなし）。環境変数 API_URL、無ければ localhost:3000 */
const apiUrl = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
/** ビルド済みの画面ファイル（dist/）の置き場所 */
const distDir = join(import.meta.dir, 'dist')

/**
 * ビルド済みの画面を配信する簡易サーバー。
 * /api 配下はAPIへ転送し、それ以外は dist/ のファイルを返す（無ければ index.html）。
 */
Bun.serve({
  port,
  async fetch(req) {
    // ================================================================
    // 1. リクエストの解釈とAPIへの転送
    //    /api で始まるものは、パスとクエリをそのままAPIへ渡す。
    // ================================================================
    const url = new URL(req.url)

    // /api はAPIへ転送する
    if (url.pathname.startsWith('/api')) {
      try {
        return await fetch(new Request(apiUrl + url.pathname + url.search, req))
      } catch {
        return new Response('APIに接続できません', { status: 502 })
      }
    }

    // ================================================================
    // 2. 画面ファイルの配信
    //    パスを正規化して dist/ の外を読ませない。実在しなければ index.html を返す。
    // ================================================================
    // dist/ の外を読まないようにパスを正規化する
    const rel = normalize(url.pathname).replace(/^([/\\])+/, '')
    const file = Bun.file(join(distDir, rel))
    // 実在するファイルならそれを返し、無ければ画面の入口（index.html）を返す
    if (rel !== '' && !rel.startsWith('..') && (await file.exists())) return new Response(file)
    return new Response(Bun.file(join(distDir, 'index.html')))
  },
})
console.log(`web: http://localhost:${port} (API: ${apiUrl})`)
