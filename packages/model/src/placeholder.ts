const ENGLISH_NUMBERED = /^item \d+$/i;
const JAPANESE_NUMBERED = /^アイテムの名前\d+$/;
const NOTE_MARK = '*';

/**
 * Tells whether a row of the game is a placeholder: a row that the game does not use. The English name is empty, starts with '*', or is "Item" and a number; or the Japanese name is "アイテムの名前" and a number.
 * @param name - the English name of the row
 * @param nameJp - the Japanese name of the row, or '' when it has none
 * @returns true for a placeholder
 * @sideEffects none
 */
export function isPlaceholder(name: string, nameJp: string): boolean {
  const english = name.trim();
  return english === '' || english.startsWith(NOTE_MARK) || ENGLISH_NUMBERED.test(english) || JAPANESE_NUMBERED.test(nameJp.trim());
}

/**
 * Turns the description of a row into the value of the model: null when it is empty or placeholder text, which starts with '*'.
 * @param text - the English description
 * @returns the description, or null when there is none
 * @sideEffects none
 */
export function descriptionOrNull(text: string): string | null {
  return text === '' || text.startsWith(NOTE_MARK) ? null : text;
}
