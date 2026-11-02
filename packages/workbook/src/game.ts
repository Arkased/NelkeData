import path from 'node:path';
import { createIconSet, type IconSet } from '@nelke/extract';
import { loadCharacters, type Characters } from './characters.js';
import { loadItems, type Items } from './items.js';
import { loadMessages, type Messages } from './messages.js';
import { loadRecipes, type Recipes } from './recipes.js';
import { loadStory, type Story } from './story.js';
import { createTableReader } from './xml.js';
import { loadZones, type Zones } from './zones.js';

/** All the game data that the sheets read. */
export interface Game {
  messages: Messages;
  icons: IconSet;
  story: Story;
  items: Items;
  characters: Characters;
  zones: Zones;
  recipes: Recipes;
}

/**
 * Loads the game data from the extracted game files.
 * @param extractedDir - the extracted folder; it holds saves/ (the XML tables) and data/ (the textures)
 * @param iconSize - the icon width in pixels
 * @returns the game data
 * @sideEffects reads the extracted game files
 */
export function loadGame(extractedDir: string, iconSize: number): Game {
  const savesDir = path.join(extractedDir, 'saves');
  const read = createTableReader(savesDir);
  const messages = loadMessages(read);
  const icons = createIconSet(savesDir, path.join(extractedDir, 'data'), iconSize);
  const story = loadStory(read, messages.t);
  const items = loadItems(read, messages.t);
  const characters = loadCharacters(read, messages.t, story.eventLabel);
  const zones = loadZones(read, messages.t, story, characters.nameOfBattleId);
  const recipes = loadRecipes(read, messages.t, { items, story, characters });
  return { messages, icons, story, items, characters, zones, recipes };
}
