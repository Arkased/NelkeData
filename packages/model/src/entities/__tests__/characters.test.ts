import { describe, expect, it } from 'vitest';
import { CharacterType } from '../../enums.js';
import type { Game } from '../../parse/game.js';
import { buildMonsters } from '../characters.js';

const PLACEHOLDER_ITEM = 'i_hidden';

describe('links to a placeholder item', () => {
  const items = { placeholderIds: new Set([PLACEHOLDER_ITEM]) };

  it('drops a monster drop link', () => {
    const row = {
      CHARACTER_ID: 'm1',
      BTL_CHARACTER_ID: 'b1',
      CHARACTER_ANILLUSTRATION_NUM: '200',
      CHARACTER_NAME_LABEL_ID: 'm1',
      CHARACTER_RANK_ID: '-1',
      CHARACTER_ANILLUSTRATION_DESCRIPTION_LABEL_ID: 'd',
      CHARACTER_SUBMONEY: '0',
    };
    const drops = [
      { id: 'i1', num: 1, rate: 10 },
      { id: PLACEHOLDER_ITEM, num: 1, rate: 10 },
    ];
    const game = {
      items,
      messages: { jp: () => '', t: () => '' },
      icons: { ref: () => '' },
      zones: { zoneEncounters: [], isBossGroup: () => false },
      characters: {
        characters: [row],
        isMonster: () => true,
        battleOf: () => ({ battle_exp: '0' }),
        typeOf: () => CharacterType.Monster,
        characterName: new Map([['m1', 'Monster']]),
        baseStat: () => 0,
        growthOf: () => null,
        elementDef: () => 0,
        dropsOf: () => drops,
      },
    } as unknown as Game;
    expect(buildMonsters(game)[0]?.drops).toEqual([{ itemId: 'i1', quantity: 1, rate: 10 }]);
  });
});
