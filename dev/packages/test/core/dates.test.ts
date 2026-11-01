import { describe, expect, test } from 'bun:test';
import { addDays, toDateString } from '../../src/core/dates.ts';

describe('toDateString', () => {
  test('ローカル日付をYYYY-MM-DDにする', () => {
    expect(toDateString(new Date(2024, 0, 5))).toBe('2024-01-05');
  });
});

describe('addDays', () => {
  test('うるう日をまたいで加算する', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });
  test('負の値で遡る（うるう日）', () => {
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
  });
  test('年をまたぐ', () => {
    expect(addDays('2023-12-31', 1)).toBe('2024-01-01');
  });
});
