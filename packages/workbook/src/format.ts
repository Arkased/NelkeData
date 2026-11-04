import type { Zone } from '@nelke/model';

/**
 * Formats a list of numbers as the lowest and the highest number.
 * @param nums - the numbers
 * @returns "5" for 1 value, "3-7" for a range
 * @sideEffects none
 */
export function range(nums: readonly number[]): string {
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? `${nums[0] ?? ''}` : `${min}-${max}`;
}

/**
 * Formats the condition that opens a zone.
 * @param zone - the zone
 * @returns "After Task N: name", or "Start" for a zone that is open from the start
 * @sideEffects none
 */
export function opensText(zone: Zone): string {
  return zone.task ? `After Task ${zone.task.number}: ${zone.task.name}` : 'Start';
}
