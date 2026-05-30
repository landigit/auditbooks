import type { Fyo } from 'fyo';
import { Money } from 'pesa';

/**
 * And so should not contain and platforma specific imports.
 */
export function getValueMapFromList<T, K extends keyof T, V extends keyof T>(
  list: T[],
  key: K,
  valueKey: V,
  filterUndefined = true
): Record<string, T[V]> {
  if (filterUndefined) {
    list = list.filter(
      (f) =>
        (Reflect.get(f as any, valueKey) as unknown) !== undefined &&
        (Reflect.get(f as any, key) as unknown) !== undefined
    );
  }

  return list.reduce(
    (acc, f) => {
      const keyValue = String(Reflect.get(f as any, key));
      const value = Reflect.get(f as any, valueKey);
      Reflect.set(acc, keyValue, value);
      return acc;
    },
    Object.create(null) as Record<string, T[V]>
  );
}

export function getRandomString(): string {
  const randomNumber = Math.random().toString(36).slice(2, 8);
  const currentTime = Date.now().toString(36);
  return `${randomNumber}-${currentTime}`;
}

export async function sleep(durationMilliseconds = 1000) {
  return new Promise((r) => setTimeout(() => r(null), durationMilliseconds));
}

export function getMapFromList<T, K extends keyof T>(
  list: T[],
  name: K
): Record<string, T> {
  /**
   * Do not convert function to use copies of T
   * instead of references.
   */
  const acc: Record<string, T> = Object.create(null);
  for (const t of list) {
    const key = Reflect.get(t as any, name);
    if (key === undefined) {
      continue;
    }

    Reflect.set(acc, String(key), t);
  }
  return acc;
}

export function getDefaultMapFromList<T, K extends keyof T, D>(
  list: T[] | string[],
  defaultValue: D,
  name?: K
): Record<string, D> {
  const acc: Record<string, D> = Object.create(null);
  if (typeof list[0] === 'string') {
    for (const l of list as string[]) {
      Reflect.set(acc, l, defaultValue);
    }

    return acc;
  }

  if (!name) {
    return Object.create(null);
  }

  for (const l of list as T[]) {
    const key = String(Reflect.get(l as any, name));
    Reflect.set(acc, key, defaultValue);
  }

  return acc;
}

export function getListFromMap<T>(map: Record<string, T>): T[] {
  return Object.keys(map).map((n) => Reflect.get(map, n));
}

export function getIsNullOrUndef(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function titleCase(phrase: string): string {
  return phrase
    .split(' ')
    .map((word) => {
      const wordLower = word.toLowerCase();
      if (['and', 'an', 'a', 'from', 'by', 'on'].includes(wordLower)) {
        return wordLower;
      }
      return wordLower[0].toUpperCase() + wordLower.slice(1);
    })
    .join(' ');
}

export function camelCase(str: string): string {
  return str
    .replace(/[^a-z0-9]/gi, ' ')
    .trim()
    .split(/\s+/)
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('');
}

export function invertMap(map: Record<string, string>): Record<string, string> {
  const keys = Object.keys(map);
  const inverted: Record<string, string> = Object.create(null);
  for (const key of keys) {
    const val = Reflect.get(map, key);
    Reflect.set(inverted, val, key);
  }

  return inverted;
}

export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (a.constructor !== b.constructor) return false;
    let length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length !== b.length) return false;
      for (i = length; i-- !== 0; )
        if (!deepEqual(Reflect.get(a, i), Reflect.get(b, i))) return false;
      return true;
    }
    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;
    for (i = length; i-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(b, Reflect.get(keys, i)))
        return false;
    for (i = length; i-- !== 0; ) {
      const key = Reflect.get(keys, i);
      if (!deepEqual(Reflect.get(a, key), Reflect.get(b, key))) return false;
    }
    return true;
  }
  return a !== a && b !== b;
}

export function time<K, T>(func: (...args: K[]) => T, ...args: K[]): T {
  /* eslint-disable no-console */
  const name = func.name;
  console.time(name);
  const stuff = func(...args);
  console.timeEnd(name);
  return stuff;
}

export async function timeAsync<K, T>(
  func: (...args: K[]) => Promise<T>,
  ...args: K[]
): Promise<T> {
  /* eslint-disable no-console */
  const name = func.name;
  console.time(name);
  const stuff = await func(...args);
  console.timeEnd(name);
  return stuff;
}

export function changeKeys<T>(
  source: Record<string, T>,
  keyMap: Record<string, string | undefined>
) {
  const dest: Record<string, T> = Object.create(null);
  for (const key of Object.keys(source)) {
    const newKey = Reflect.get(keyMap, key) ?? key;
    Reflect.set(dest, newKey, Reflect.get(source, key));
  }

  return dest;
}

export function deleteKeys<T>(
  source: Record<string, T>,
  keysToDelete: string[]
) {
  const dest: Record<string, T> = Object.create(null);
  for (const key of Object.keys(source)) {
    if (keysToDelete.includes(key)) {
      continue;
    }
    Reflect.set(dest, key, Reflect.get(source, key));
  }

  return dest;
}

function safeParseNumber(value: unknown, parser: (v: string) => number) {
  let parsed: number;
  switch (typeof value) {
    case 'string':
      parsed = parser(value);
      break;
    case 'number':
      parsed = value;
      break;
    default:
      parsed = Number(value);
      break;
  }

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

export function safeParseFloat(value: unknown): number {
  return safeParseNumber(value, Number);
}

export function safeParseInt(value: unknown): number {
  return safeParseNumber(value, (v: string) => Math.trunc(Number(v)));
}

export function safeParsePesa(value: unknown, fyo: Fyo): Money {
  if (value instanceof Money) {
    return value;
  }

  if (typeof value === 'number') {
    return fyo.pesa(value);
  }

  if (typeof value === 'bigint') {
    return fyo.pesa(value);
  }

  if (typeof value !== 'string') {
    return fyo.pesa(0);
  }

  try {
    return fyo.pesa(value);
  } catch {
    return fyo.pesa(0);
  }
}

export function joinMapLists<A, B>(
  listA: A[],
  listB: B[],
  keyA: keyof A,
  keyB: keyof B
): (A & B)[] {
  const mapA = getMapFromList(listA, keyA);
  const mapB = getMapFromList(listB, keyB);

  const keyListA = listA
    .map((i) => Reflect.get(i as any, keyA))
    .filter((k) => (k as unknown as string) in mapB);

  const keyListB = listB
    .map((i) => Reflect.get(i as any, keyB))
    .filter((k) => (k as unknown as string) in mapA);

  const keys = new Set([keyListA, keyListB].flat().sort());

  const joint: (A & B)[] = [];
  for (const k of keys) {
    const a = Reflect.get(mapA, k as unknown as string);
    const b = Reflect.get(mapB, k as unknown as string);
    const c = { ...a, ...b };

    joint.push(c);
  }

  return joint;
}

export function removeAtIndex<T>(array: T[], index: number): T[] {
  if (index < 0 || index >= array.length) {
    return array;
  }

  return [...array.slice(0, index), ...array.slice(index + 1)];
}

/**
 * Asserts that `value` is of type T. Use with care.
 */
export const assertIsType = <T>(_value: unknown): _value is T => true;

const PROTOTYPE_POLLUTION_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

export function safeGet<T = any>(obj: any, key: any): T | undefined {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  if (PROTOTYPE_POLLUTION_KEYS.has(String(key))) {
    return undefined;
  }
  return Reflect.get(obj, key) as T;
}

export function safeSet(obj: any, key: any, value: any): boolean {
  if (obj === null || obj === undefined) {
    return false;
  }
  if (PROTOTYPE_POLLUTION_KEYS.has(String(key))) {
    return false;
  }
  return Reflect.set(obj, key, value);
}
