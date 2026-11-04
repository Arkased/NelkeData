import { addInverseLinks } from '../inverse.js';
import { loadGame, type Game } from '../parse/game.js';
import type { ModelData } from '../schema/index.js';
import { buildCharacters, buildMonsters } from './characters.js';
import { idMap } from './ids.js';
import { buildItems } from './items.js';
import { buildRecipeSets, buildRecipes, buildResearch } from './recipes.js';
import { buildAreas, buildZones } from './zones.js';

/** The width in pixels of the icons that the model writes. */
export const ICON_SIZE = 128;

/** The entities of the model and the icon files that they name. */
export interface BuiltModel {
  data: ModelData;
  /** Maps each icon file name to its PNG data. */
  icons: ReadonlyMap<string, Buffer>;
}

/**
 * Makes the entities of the model from the game data.
 * @param game - the game data
 * @returns the entities with both sides of each link, and the icons that they name
 * @throws {Error} when a link of the game names a row that the model does not hold
 * @sideEffects decodes the icon textures that the entities name
 */
export function buildModelFrom(game: Game): BuiltModel {
  const { characters, items } = game;
  const itemIds = idMap(items.items, (i) => i.ITEM_ID);
  const monsterIds = idMap(characters.characters.filter(characters.isMonster), (c) => c.CHARACTER_ID);
  const characterIds = idMap(
    characters.characters.filter((c) => !characters.isMonster(c)),
    (c) => c.CHARACTER_ID,
  );
  const data = addInverseLinks({
    items: buildItems(game),
    recipes: buildRecipes(game, { itemIds, characterIds }),
    recipeSets: buildRecipeSets(game, { itemIds, characterIds }),
    research: buildResearch(game, { characterIds }),
    zones: buildZones(game, { itemIds }),
    areas: buildAreas(game, { itemIds, monsterIds }),
    monsters: buildMonsters(game, { itemIds }),
    characters: buildCharacters(game),
  });
  return { data, icons: game.icons.images };
}

/**
 * Makes the entities of the model from the extracted game files.
 * @param extractedDir - the extracted folder; it holds saves/ and data/
 * @returns the entities and the icons
 * @throws {Error} when a link of the game names a row that the model does not hold
 * @sideEffects reads the extracted game files
 */
export function buildModel(extractedDir: string): BuiltModel {
  return buildModelFrom(loadGame(extractedDir, ICON_SIZE));
}
