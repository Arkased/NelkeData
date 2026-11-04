import path from 'node:path';
import { loadCharacters, type Characters } from './characters.js';
import { createIcons, type Icons } from './icons.js';
import { loadItems, type Items } from './items.js';
import { loadMessages, type Messages } from './messages.js';
import { loadRecipes, type Recipes } from './recipes.js';
import { loadStory, type Story } from './story.js';
import { createTableReader } from './xml.js';
import { loadZones, type Zones } from './zones.js';

/** All the game data that the entities are made of. */
export interface Game {
  messages: Messages;
  icons: Icons;
  story: Story;
  items: Items;
  characters: Characters;
  zones: Zones;
  recipes: Recipes;
}

/**
 * Loads the game data from the extracted game files.
 * @param extractedDir - the extracted folder; it holds saves/ (the XML tables) and data/ (the textures)
 * @param iconSizes - the icon widths in pixels
 * @returns the game data
 * @sideEffects reads the extracted game files
 */
export function loadGame(extractedDir: string, iconSizes: readonly number[]): Game {
  const savesDir = path.join(extractedDir, 'saves');
  const read = createTableReader(savesDir);
  const messages = loadMessages(read);
  const icons = createIcons(savesDir, path.join(extractedDir, 'data'), iconSizes);
  const story = loadStory(read, messages.t);
  const items = loadItems(read, messages);
  const characters = loadCharacters(read, messages);
  const zones = loadZones(read, messages, story);
  const recipes = loadRecipes(read, messages, items);
  return { messages, icons, story, items, characters, zones, recipes };
}
