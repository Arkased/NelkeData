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
 * Turns an empty text into null, the value of the model for a missing text.
 * @param text - the text
 * @returns the text, or null when it is empty
 * @sideEffects none
 */
export function orNull(text: string): string | null {
  return text === '' ? null : text;
}

/**
 * Gets the value of a key in a map, adding a new value first when the key is new.
 * @param map - the map
 * @param key - the key
 * @param create - makes the value for a new key
 * @returns the value of the key
 * @sideEffects adds the new value to the map when the key has none
 */
export function getOrCreate<K, V>(map: Map<K, V>, key: K, create: () => V): V {
  let value = map.get(key);
  if (value === undefined) {
    value = create();
    map.set(key, value);
  }
  return value;
}

/**
 * Gets the list of a key in a map of lists, adding an empty list first when the key is new.
 * @param map - the map of lists
 * @param key - the key
 * @returns the list of the key
 * @sideEffects adds an empty list to the map when the key has none
 */
export function listFor<K, V>(map: Map<K, V[]>, key: K): V[] {
  return getOrCreate(map, key, () => []);
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
