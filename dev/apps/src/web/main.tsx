import { createRoot } from 'react-dom/client'
import { App } from './App'

/** 画面の入口。#root に App を描画する */
createRoot(document.getElementById('root')!).render(<App />)
