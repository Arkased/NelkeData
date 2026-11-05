import { CharacterType, type Character } from '@nelke/model';

/** The group of a character that the Characters page shows as a line and as a filter. */
export enum CharacterGroup {
  Alchemist = 'Alchemist',
  Townsfolk = 'Townsfolk',
}

/** The join event of the game start: a character with this event joins with no story event. */
export const GAME_START_EVENT_ID = 'EVENT_MS01_010';

/** The town population at the start of the game: `OC_INITIAL_POPULATION` in `out_constant/out_constant.xml`. */
export const START_POPULATION = 30;

/** The turn at or below which every player meets the join condition. */
export const START_TURN = 1;

/**
 * Returns the group of a character.
 * @param character - the character
 * @returns Alchemist for the type Alchemist, and Townsfolk for each other type
 * @sideEffects none
 */
export function groupOf(character: Character): CharacterGroup {
  return character.type === CharacterType.Alchemist ? CharacterGroup.Alchemist : CharacterGroup.Townsfolk;
}

/**
 * Tells whether a character has a page: only a character with a join event does.
 * @param character - the character
 * @returns true when the join event is not null
 * @sideEffects none
 */
export function hasCharacterPage(character: Character): boolean {
  return character.join?.event != null;
}
