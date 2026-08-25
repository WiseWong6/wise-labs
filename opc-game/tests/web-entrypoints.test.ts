import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('街机版入口加载游戏运行时', async () => {
  const html = await readFile(new URL('../web/index.html', import.meta.url), 'utf8')
  assert.match(html, /<body data-theme="arcade">/)
  assert.match(html, /<title>沉浸街机版/)
  assert.match(html, /<link rel="icon" href="\.\/icon\.png" type="image\/png"\s*\/>/)
  assert.match(html, /src="\.\/src\/main\.ts"/)
  assert.doesNotMatch(html, /https?:\/\//)
})
