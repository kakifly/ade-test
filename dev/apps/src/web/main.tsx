import { createRoot } from 'react-dom/client'
import { App } from './App'
import { OrderTableSample } from './components/order-table/OrderTableSample'

/** 画面の入口。#root に App を描画する。URLが #order-table のときだけ表のサンプルを出す */
createRoot(document.getElementById('root')!).render(location.hash === '#order-table' ? <OrderTableSample /> : <App />)
