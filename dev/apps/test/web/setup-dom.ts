import { Window } from 'happy-dom'

// testing-library が使う DOM のグローバルを用意する（bunfig を使わず、テストから import する）
const win = new Window({ url: 'http://localhost/' })
const g = globalThis as Record<string, unknown>
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Element', 'MutationObserver', 'Event', 'KeyboardEvent', 'MouseEvent', 'HTMLInputElement', 'getComputedStyle']) {
  g[key] = (win as unknown as Record<string, unknown>)[key]
}
g.IS_REACT_ACT_ENVIRONMENT = true
