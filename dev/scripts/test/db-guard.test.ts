import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';

const guard = new URL('../src/db-guard.sh', import.meta.url).pathname;

/**
 * db-guard.sh の assert_dedicated_db を実行し、終了コードとエラー出力を返す。
 * @param root 作業ディレクトリのルート
 * @param url 接続先のURL（テストでは実在しない値を使う）
 * @returns 終了コード（0なら許可）とエラー出力
 */
function run(root: string, url: string): { status: number | null; stderr: string } {
  const r = spawnSync('bash', ['-c', `source "${guard}"; assert_dedicated_db "$1" "$2"`, 'x', root, url], { encoding: 'utf8' });
  return { status: r.status, stderr: r.stderr };
}

describe('assert_dedicated_db', () => {
  test('作業領域（.worktrees）から、共有のテスト用DBに向けると中止する', () => {
    const r = run('/repo/.worktrees/a', 'postgres://u:p@h:5432/habit_app_test');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('共有');
  });

  test('作業領域から、共有のe2e用DBに向けると中止する（接続パラメータが付いていても）', () => {
    expect(run('/repo/.worktrees/a', 'postgres://u:p@h/habit_app_e2e?sslmode=disable').status).not.toBe(0);
  });

  test('作業領域専用のDB名なら許可する', () => {
    expect(run('/repo/.worktrees/a', 'postgres://u:p@h/habit_app_test_a').status).toBe(0);
    expect(run('/repo/.worktrees/a', 'postgres://u:p@h/habit_app_e2e_a').status).toBe(0);
  });

  test('本体（.worktrees の外）では、共有のDBでも許可する', () => {
    expect(run('/repo', 'postgres://u:p@h/habit_app_test').status).toBe(0);
  });

  test('中止のメッセージに、接続情報を含めない', () => {
    const r = run('/repo/.worktrees/a', 'postgres://user:SECRETPW@host/habit_app_test');
    expect(r.stderr).not.toContain('SECRETPW');
  });
});
