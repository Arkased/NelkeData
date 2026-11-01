// Finds and decodes the game icons for items, characters and monsters.
// The UI style files (ui/etc/uis_20th_*.xml) list the textures in image number order.
const fs = require('fs');
const path = require('path');
const { g1tToPng } = require('./g1t');

const LISTS = {
  item: 'uis_20th_item_l.xml',
  npc: 'uis_20th_npc_faceicon.xml',
  monster: 'uis_20th_monster_faceicon.xml',
};

/**
 * Creates an icon set. `ref(kind, number)` decodes the icon on first use and returns its
 * PNG file name, or '' when the texture is not extracted.
 * `images` maps each file name to its PNG data.
 * @param {string} savesDir - the extracted saves folder
 * @param {string} dataDir - the extracted folder that holds x64/ui/*.g1t
 * @param {number} size - icon width in pixels
 */
function createIconSet(savesDir, dataDir, size) {
  const lists = {};
  for (const [kind, file] of Object.entries(LISTS)) {
    const xml = fs.readFileSync(path.join(savesDir, 'ui', 'etc', file), 'utf8');
    lists[kind] = [...xml.matchAll(/texture="ui\/([^"]+)"/g)].map((m) => m[1]);
  }
  const images = new Map();
  const missing = new Set();
  function ref(kind, number) {
    const texture = lists[kind][number];
    if (!texture || missing.has(texture)) return '';
    const name = texture.replace(/^20th_/, '').replace(/\.g1t$/, '.png');
    if (!images.has(name)) {
      const file = path.join(dataDir, 'x64', 'ui', texture);
      if (!fs.existsSync(file)) {
        missing.add(texture);
        return '';
      }
      images.set(name, g1tToPng(fs.readFileSync(file), size));
    }
    return name;
  }
  return { ref, images };
}

module.exports = { createIconSet };
