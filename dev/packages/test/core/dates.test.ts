import { describe, expect, test } from 'bun:test';
import { addDays, isWithinServerWindow, toDateString } from '../../src/core/dates.ts';

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

describe('isWithinServerWindow', () => {
  const now = new Date('2024-03-10T12:00:00Z');
  test('UTC日付の前日・当日・翌日は許可', () => {
    expect(isWithinServerWindow('2024-03-09', now)).toBe(true);
    expect(isWithinServerWindow('2024-03-10', now)).toBe(true);
    expect(isWithinServerWindow('2024-03-11', now)).toBe(true);
  });
  test('前々日と翌々日は不許可', () => {
    expect(isWithinServerWindow('2024-03-08', now)).toBe(false);
    expect(isWithinServerWindow('2024-03-12', now)).toBe(false);
  });
  test('UTCの日付境界でも判定が崩れない', () => {
    const edge = new Date('2024-03-10T23:59:59Z');
    expect(isWithinServerWindow('2024-03-11', edge)).toBe(true);
    expect(isWithinServerWindow('2024-03-12', edge)).toBe(false);
  });
});
