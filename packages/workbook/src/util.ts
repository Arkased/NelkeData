/**
 * Tells whether a game name is a placeholder: empty, or starting with '*'.
 * @param name - the English name of a row
 * @returns true for a placeholder
 * @sideEffects none
 */
export function isPlaceholder(name: string): boolean {
  return !name || name.startsWith('*');
}

/**
 * Rounds a number to 2 decimals.
 * @param n - the number to round
 * @returns the rounded number
 * @sideEffects none
 */
export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Removes the repeated values of a list, keeping the first of each.
 * @param list - the values
 * @returns the distinct values in first-seen order
 * @sideEffects none
 */
export function unique<T>(list: readonly T[]): T[] {
  return [...new Set(list)];
}

/**
 * Formats the span of a list of numbers as "min-max", or as the number alone when all are equal.
 * @param nums - the numbers, at least 1
 * @returns the text of the span
 * @sideEffects none
 */
export function range(nums: readonly number[]): string {
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? `${nums[0] ?? ''}` : `${min}-${max}`;
}

/**
 * Gets the list of a key in a map of lists, adding an empty list first when the key is new.
 * @param map - the map of lists
 * @param key - the key
 * @returns the list of the key
 * @sideEffects adds an empty list to the map when the key has none
 */
export function listFor<K, V>(map: Map<K, V[]>, key: K): V[] {
  let list = map.get(key);
  if (!list) {
    list = [];
    map.set(key, list);
  }
  return list;
}

/**
 * Gets the value of a key that must exist.
 * @param map - the map to read
 * @param key - the key
 * @returns the value of the key
 * @throws {Error} when the map has no such key
 * @sideEffects none
 */
export function required<K, V>(map: ReadonlyMap<K, V>, key: K): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`missing key ${String(key)}`);
  return value;
}
