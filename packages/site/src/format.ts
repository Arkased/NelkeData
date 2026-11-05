const NUMBER_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

/** The rate that is certain: the page does not show it. */
const CERTAIN_RATE = 100;

/**
 * Formats a number with at most 1 decimal, no floating-point error, and a comma for each 3 digits.
 * @param value - the number
 * @returns the text, for example `12,000` or `12.5`
 * @sideEffects none
 */
export function formatNumber(value: number): string {
  // Adding 0 turns a rounded -0 into 0.
  return NUMBER_FORMAT.format(Math.round(value * 10) / 10 + 0);
}

/**
 * Formats the levels of an appearance as the badge text of a tile or an entry.
 * @param levels - the levels at which the monster appears
 * @returns `Lv 5` for 1 level, `Lv 3–8` for a range, or null when there is no level
 * @sideEffects none
 */
export function formatLevelRange(levels: readonly number[]): string | null {
  if (levels.length === 0) return null;
  const low = Math.min(...levels);
  const high = Math.max(...levels);
  return low === high ? `Lv ${low}` : `Lv ${low}–${high}`;
}

/**
 * Formats a rate in percent, or returns null for a rate of 100%, which tells nothing.
 * @param rate - the rate as a percent number
 * @returns the text, for example `12.5%`, or null for a certain rate
 * @sideEffects none
 */
export function formatRate(rate: number): string | null {
  return Math.round(rate * 10) / 10 === CERTAIN_RATE ? null : `${formatNumber(rate)}%`;
}
