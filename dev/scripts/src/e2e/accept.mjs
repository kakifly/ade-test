import { chromium } from 'playwright-core';
import os from 'node:os';
import { mkdirSync } from 'node:fs';

// 画面の受入確認（A-01〜A-05、A-07〜A-09、XSS）。APIと画面を起動した状態で実行する（単独実行: node accept.mjs）
// 環境変数: CHROME_PATH（ブラウザの実行ファイル）、BASE_URL、API_URL、OUT_DIR（スクリーンショットの出力先）
// 注意: 接続先のDBの習慣を、最初と最後に全て削除する。通常は `pnpm run e2e`（e2e専用のDB habit_app_e2e で、API・画面を自動で起動する）で実行する
// 終了コード: すべての確認が成功なら0、1つでも失敗なら1

// ================================================================
// 1. 実行環境の設定
//    ブラウザの場所、スクリーンショットの出力先、接続先URLを環境変数から決める
// ================================================================
const exe = process.env.CHROME_PATH ?? `${os.homedir()}/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`;
const SP = process.env.OUT_DIR ?? `${os.tmpdir()}/habit-e2e`;
mkdirSync(SP, { recursive: true });
const API = process.env.API_URL ?? 'http://localhost:3000';
const BASE = process.env.BASE_URL ?? 'http://localhost:5173';

// ================================================================
// 2. 確認結果の記録と操作用の部品
//    画面操作を短く書くための関数を用意する
// ================================================================
/** 確認結果の一覧（{ id, ok, note }）。最後に終了コードを決めるのに使う */
const results = [];
/**
 * 確認結果を記録し、1行で表示する。
 * @param id 受入基準のID（例: A-01）
 * @param ok 成功ならtrue
 * @param note 表示する補足（実際の値など）
 */
const rec = (id, ok, note = '') => { results.push({ id, ok, note }); console.log(`${ok ? 'OK ' : 'NG '} ${id} ${note}`); };

// ================================================================
// 3. ブラウザの起動とコンソールエラーの収集
//    A-08 で使うため、ページ内のエラーを配列にためておく
// ================================================================
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 800 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

/** 習慣名を入力して「追加」を押す。 */
const add = async (p, name) => { await p.fill('#habit-name', name); await p.click('button:has-text("追加")'); };
/** 習慣の行（一覧のli）全体を返す。 */
const rows = (p) => p.locator('[data-testid=habit-row]');
/** 指定した習慣名を含む行を返す。 */
const row = (p, name) => p.locator('[data-testid=habit-row]', { hasText: name });
/** 指定ミリ秒だけ待つ（画面の更新待ち）。 */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ================================================================
// 4. 事前の後始末
//    前回の習慣が残っていると件数の確認がずれるため、全て削除する（開発DBは空の想定だが念のため）
// ================================================================
await page.goto(BASE);
await page.waitForSelector('form');
for (let i = 0; i < 20 && (await rows(page).count()) > 0; i++) { await rows(page).first().locator('button:has-text("削除")').click(); await wait(300); }

// ================================================================
// 5. A-01 習慣の追加
//    習慣を2つ追加し、一覧が2件になることを確認する
// ================================================================
await add(page, '朝のストレッチ'); await row(page, '朝のストレッチ').waitFor();
await add(page, '読書'); await row(page, '読書').waitFor();
rec('A-01', (await rows(page).count()) === 2, '習慣を2つ追加');

// ================================================================
// 6. A-02 入力エラー
//    空、空白のみ、同名の3パターンでエラーが出て、件数が増えないことを確認する
// ================================================================
await page.fill('#habit-name', ''); await page.click('button:has-text("追加")'); await wait(300);
const e1 = await page.locator('#habit-name-error').textContent().catch(() => null);
await page.fill('#habit-name', '   '); await page.click('button:has-text("追加")'); await wait(300);
const e2 = await page.locator('#habit-name-error').textContent().catch(() => null);
await add(page, '読書'); await wait(600);
const e3 = await page.locator('#habit-name-error').textContent().catch(() => null);
rec('A-02', !!e1 && !!e2 && !!e3 && (await rows(page).count()) === 2, `空="${e1}" 空白="${e2}" 同名="${e3}"`);
await page.screenshot({ path: `${SP}/a02-error.png` });

// ================================================================
// 7. A-03 チェックの付与と解除
//    チェックで連続日数が1日になり、解除で0日に戻ることを確認する
// ================================================================
/** 指定した習慣の連続日数の表示要素を返す。 */
const chip = (p, n) => row(p, n).locator('[data-testid=streak-chip]');
await row(page, '朝のストレッチ').locator('input[type=checkbox]').click(); await wait(600);
const s1 = await chip(page, '朝のストレッチ').textContent();
await row(page, '朝のストレッチ').locator('input[type=checkbox]').click(); await wait(600);
const s0 = await chip(page, '朝のストレッチ').textContent();
rec('A-03', s1 === '1日' && s0 === '0日', `チェック後=${s1} 解除後=${s0}`);

// ================================================================
// 8. A-04 再読み込み後の保持
//    チェックしてから再読み込みし、チェック状態と件数が保たれることを確認する
// ================================================================
await row(page, '朝のストレッチ').locator('input[type=checkbox]').click(); await wait(600);
await page.reload(); await page.waitForSelector('[data-testid=habit-row]');
const kept = await row(page, '朝のストレッチ').locator('input[type=checkbox]').isChecked();
const keptChip = await chip(page, '朝のストレッチ').textContent();
rec('A-04', kept && keptChip === '1日' && (await rows(page).count()) === 2, `再読み込み後 checked=${kept} ${keptChip}`);
await page.screenshot({ path: `${SP}/a04-main.png`, fullPage: true });

// ================================================================
// 9. A-05 削除と再登録
//    削除すると消え、同名で再登録すると連続日数が0から始まることを確認する
// ================================================================
await row(page, '朝のストレッチ').locator('button:has-text("削除")').click(); await wait(600);
const gone = (await row(page, '朝のストレッチ').count()) === 0;
await add(page, '朝のストレッチ'); await row(page, '朝のストレッチ').waitFor();
const re = await chip(page, '朝のストレッチ').textContent();
rec('A-05', gone && re === '0日', `削除後に消えた=${gone} 再登録=${re}`);

// ================================================================
// 10. A-09 2つのタブでの競合
//    古い状態のタブから操作して、409時のメッセージ表示と、望む状態にすでになっている場合の成功扱いを確認する
// ================================================================
const p2 = await ctx.newPage(); await p2.goto(BASE); await p2.waitForSelector('[data-testid=habit-row]');
const n = '読書';
// 準備: p2 は古い状態（未チェック, v）を保持。p1 がチェック→解除して最新にする
await row(page, n).locator('input[type=checkbox]').click(); await wait(500);
await row(page, n).locator('input[type=checkbox]').click(); await wait(500);
// p2 の古い状態でチェック → 409 → 再取得 → 望む状態(checked)と最新(unchecked)が違う → メッセージ
await row(p2, n).locator('input[type=checkbox]').click(); await wait(800);
const alertTxt = await p2.locator('[role=alert]').allTextContents();
const p2checked = await row(p2, n).locator('input[type=checkbox]').isChecked();
rec('A-09(メッセージ)', alertTxt.some((t) => t.trim().length > 0) && !p2checked, `alert=${JSON.stringify(alertTxt)} p2checked=${p2checked}`);
await p2.screenshot({ path: `${SP}/a09-conflict.png` });
// 望む状態にすでになっている場合は成功扱い: p1 がチェック → p2(古い: 未チェック)がチェック
await p2.reload(); await p2.waitForSelector('[data-testid=habit-row]');
await row(page, n).locator('input[type=checkbox]').click(); await wait(500);
await row(p2, n).locator('input[type=checkbox]').click(); await wait(800);
const p2alerts = (await p2.locator('[role=alert]').allTextContents()).filter((t) => t.trim());
const p2c = await row(p2, n).locator('input[type=checkbox]').isChecked();
rec('A-09(already)', p2alerts.length === 0 && p2c, `alert=${JSON.stringify(p2alerts)} checked=${p2c}`);
await p2.close();
await row(page, n).locator('input[type=checkbox]').click().catch(() => {}); await wait(500);

// ================================================================
// 11. A-07 日付が変わった後のチェック
//    ブラウザの時計を翌日に差し替えてチェックし、新しい日付に記録され、実際の今日には記録されないことを確認する
// ================================================================
const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
const p3 = await ctx.newPage();
await p3.clock.install({ time: tomorrow });
await p3.goto(BASE); await p3.waitForSelector('[data-testid=habit-row]');
await row(p3, n).locator('input[type=checkbox]').click(); await wait(800);
const pad = (x) => String(x).padStart(2, '0');
const ld = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
const api = await (await fetch(`${API}/api/habits?today=${ld}`)).json();
const todayReal = new Date(); const rd = `${todayReal.getFullYear()}-${pad(todayReal.getMonth() + 1)}-${pad(todayReal.getDate())}`;
const apiReal = await (await fetch(`${API}/api/habits?today=${rd}`)).json();
const h1 = api.find((h) => h.name === n), h2 = apiReal.find((h) => h.name === n);
rec('A-07', h1?.checkedToday === true && h2?.checkedToday === false, `差し替え日(${ld}) checked=${h1?.checkedToday}、実際の今日(${rd}) checked=${h2?.checkedToday}`);
await p3.close();

// ================================================================
// 12. N-05 XSS（スクリプトの無害化）
//    script タグを含む習慣名が、文字列として表示され、要素として実行されないことを確認する
// ================================================================
await add(page, '<script>alert(1)</script>'); await wait(600);
const scriptEls = await page.locator('[data-testid=habit-row] script').count();
const txt = await row(page, '<script>').locator('[data-testid=habit-label]').textContent().catch(() => null);
rec('N-05(XSS)', scriptEls === 0 && txt === '<script>alert(1)</script>', `script要素=${scriptEls} 表示="${txt}"`);

// ================================================================
// 13. A-08 コンソールエラーが無いこと
//    ここまでの操作で出たエラーのうち、意図して起こした409のログは除いて確認する
// ================================================================
// ブラウザは 4xx 応答を「Failed to load resource」として必ずログに出す（同名の追加で409を意図的に起こしている）
const unexpected = consoleErrors.filter((t) => !/Failed to load resource: .* status of 409/.test(t));
rec('A-08', unexpected.length === 0, `想定外のコンソールエラー=${JSON.stringify(unexpected)}（意図した409のログ=${consoleErrors.length - unexpected.length}件）`);

// ================================================================
// 14. 見た目の確認
//    背景色・文字色・フォントの計算結果を出力し、最終画面のスクリーンショットを撮る
// ================================================================
const style = await page.evaluate(() => {
  const cs = getComputedStyle(document.body);
  const hdg = document.querySelector('h1');
  return { bodyBg: cs.backgroundColor, bodyColor: cs.color, bodyFont: cs.fontFamily, h1Font: hdg ? getComputedStyle(hdg).fontFamily : null };
});
console.log('STYLE', JSON.stringify(style));
await page.screenshot({ path: `${SP}/final.png`, fullPage: true });

// ================================================================
// 15. 事後の後始末と結果の出力
//    作った習慣を全て削除してブラウザを閉じ、1つでも失敗があれば終了コード1で終わる
// ================================================================
for (let i = 0; i < 20 && (await rows(page).count()) > 0; i++) { await rows(page).first().locator('button:has-text("削除")').click(); await wait(300); }
await browser.close();
console.log('SUMMARY', JSON.stringify(results.map((r) => [r.id, r.ok])));
process.exit(results.every((r) => r.ok) ? 0 : 1);
