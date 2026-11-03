import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const guard = new URL('../src/db-guard.sh', import.meta.url).pathname;

/** テスト用の一時ディレクトリ（本体のリポジトリと、その外に作る作業領域を置く） */
let tmp: string;
/** 本体のリポジトリ（git init しただけの通常のチェックアウト） */
let main: string;
/** 本体の外（兄弟ディレクトリ）に作った作業領域 */
let outside: string;
/** 本体の中（.worktrees/ の下）に作った作業領域 */
let inside: string;

/**
 * 親プロセスの GIT_* 環境変数（GIT_DIR、GIT_INDEX_FILE など）を除いた環境変数を返す。
 * git の hook（husky の pre-commit など）の中でテストが動くと、これらが設定されている。
 * 引き継ぐと、テスト用の一時リポジトリではなく、実際のリポジトリを書き換えてしまう。
 * @returns GIT_* を除いた環境変数
 */
function cleanEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
}

/**
 * git を実行する。失敗したらテストを止める。
 * @param cwd 実行するディレクトリ
 * @param args git の引数
 */
function git(cwd: string, ...args: string[]): void {
  const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', env: cleanEnv() });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} に失敗: ${r.stderr}`);
}

beforeAll(() => {
  tmp = realpathSync(mkdtempSync(join(tmpdir(), 'db-guard-')));
  main = join(tmp, 'repo');
  outside = join(tmp, 'repo-worktrees', 'a');
  inside = join(main, '.worktrees', 'b');
  git(tmp, 'init', '-q', main);
  git(main, 'commit', '-q', '--allow-empty', '-m', 'init');
  git(main, 'worktree', 'add', '-q', outside, '-b', 'feature/a');
  git(main, 'worktree', 'add', '-q', inside, '-b', 'feature/b');
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

/**
 * db-guard.sh の assert_dedicated_db を実行し、終了コードとエラー出力を返す。
 * @param root 作業ディレクトリのルート
 * @param url 接続先のURL（テストでは実在しない値を使う）
 * @param env 子プロセスの環境変数（既定は GIT_* を除いたもの）
 * @returns 終了コード（0なら許可）とエラー出力
 */
function run(root: string, url: string, env: NodeJS.ProcessEnv = cleanEnv()): { status: number | null; stderr: string } {
  const r = spawnSync('bash', ['-c', `source "${guard}"; assert_dedicated_db "$1" "$2"`, 'x', root, url], { encoding: 'utf8', env });
  return { status: r.status, stderr: r.stderr };
}

describe('assert_dedicated_db', () => {
  test('本体の外にある作業領域から、共有のテスト用DBに向けると中止する', () => {
    const r = run(outside, 'postgres://u:p@h:5432/habit_app_test');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('共有');
  });

  test('本体の中（.worktrees）にある作業領域でも、共有のDBは中止する', () => {
    expect(run(inside, 'postgres://u:p@h/habit_app_test').status).not.toBe(0);
  });

  test('作業領域から、共有のe2e用DBに向けると中止する（接続パラメータが付いていても）', () => {
    expect(run(outside, 'postgres://u:p@h/habit_app_e2e?sslmode=disable').status).not.toBe(0);
  });

  test('作業領域専用のDB名なら許可する', () => {
    expect(run(outside, 'postgres://u:p@h/habit_app_test_a').status).toBe(0);
    expect(run(outside, 'postgres://u:p@h/habit_app_e2e_a').status).toBe(0);
  });

  test('本体では、共有のDBでも許可する', () => {
    expect(run(main, 'postgres://u:p@h/habit_app_test').status).toBe(0);
  });

  test('git の管理外のディレクトリでは、安全側に倒して共有のDBを中止する', () => {
    expect(run(tmp, 'postgres://u:p@h/habit_app_test').status).not.toBe(0);
  });

  test('git の hook の中のように GIT_DIR などが設定されていても、作業領域を正しく判定する', () => {
    // hook の中では、実行中のリポジトリを指す GIT_DIR が設定される。判定がこれに引きずられないことを確かめる
    const env = { ...cleanEnv(), GIT_DIR: join(main, '.git'), GIT_INDEX_FILE: join(main, '.git', 'index') };
    expect(run(outside, 'postgres://u:p@h/habit_app_test', env).status).not.toBe(0);
    expect(run(main, 'postgres://u:p@h/habit_app_test', env).status).toBe(0);
  });

  test('中止のメッセージに、接続情報を含めない', () => {
    const r = run(outside, 'postgres://user:SECRETPW@host/habit_app_test');
    expect(r.stderr).not.toContain('SECRETPW');
  });
});
