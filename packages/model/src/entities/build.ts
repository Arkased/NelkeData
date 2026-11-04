import { ICON_SIZES } from '../files.js';
import { addInverseLinks } from '../inverse.js';
import { loadGame, type Game } from '../parse/game.js';
import type { ModelData } from '../schema/index.js';
import { buildCharacters, buildMonsters } from './characters.js';
import { idSet } from './ids.js';
import { buildItems } from './items.js';
import { buildRecipeSets, buildRecipes, buildResearch } from './recipes.js';
import { buildAreas, buildZones } from './zones.js';

/** The entities of the model and the icon files that they name. */
export interface BuiltModel {
  data: ModelData;
  /** Maps each icon size to its PNG data by file name. */
  icons: ReadonlyMap<number, ReadonlyMap<string, Buffer>>;
}

/**
 * Makes the entities of the model from the game data.
 * @param game - the game data
 * @returns the entities with both sides of each link, and the icons that they name
 * @throws {Error} when a link of the game names a row that the model does not hold
 * @sideEffects decodes the icon textures that the entities name
 */
export function buildModelFrom(game: Game): BuiltModel {
  const { characters } = game;
  const monsterIds = idSet(characters.characters.filter(characters.isMonster), (c) => c.CHARACTER_ID);
  const characterIds = idSet(
    characters.characters.filter((c) => !characters.isMonster(c)),
    (c) => c.CHARACTER_ID,
  );
  const data = addInverseLinks({
    items: buildItems(game),
    recipes: buildRecipes(game),
    recipeSets: buildRecipeSets(game, { characterIds }),
    research: buildResearch(game, { characterIds }),
    zones: buildZones(game),
    areas: buildAreas(game, { monsterIds }),
    monsters: buildMonsters(game),
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
  return buildModelFrom(loadGame(extractedDir, ICON_SIZES));
}
