import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BASE_PATH } from '../../src/base.js';
import { checkLinks } from '../check-links.js';

let dist: string;

/**
 * Writes a file under the temp build folder.
 * @param path - the path below the folder
 * @param content - the file content
 */
function write(path: string, content = ''): void {
  mkdirSync(dirname(join(dist, path)), { recursive: true });
  writeFileSync(join(dist, path), content);
}

/**
 * Writes the page `index.html` with 1 link.
 * @param tag - the HTML of the link
 */
function pageWith(tag: string): void {
  write('index.html', `<html><body>${tag}</body></html>`);
}

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'check-links-'));
});

afterEach(() => {
  rmSync(dist, { recursive: true, force: true });
});

describe('checkLinks', () => {
  it('resolves a trailing slash to index.html', () => {
    write('items/index.html');
    pageWith(`<a href="${BASE_PATH}items/">Items</a><a href="${BASE_PATH}">Home</a>`);
    expect(checkLinks(dist)).toEqual([]);
  });

  it('removes the query and the fragment', () => {
    write('items/index.html');
    write('app.css');
    pageWith(`<a href="${BASE_PATH}items/?q=1#top">A</a><link href="${BASE_PATH}app.css?v=2" rel="stylesheet" />`);
    expect(checkLinks(dist)).toEqual([]);
  });

  it('reads href of a and link and src of img and script', () => {
    pageWith(
      `<a href="${BASE_PATH}a/">A</a><link href="${BASE_PATH}b.css" /><img src="${BASE_PATH}c.png" /><script src="${BASE_PATH}d.js"></script>`,
    );
    expect(checkLinks(dist)).toEqual([
      `index.html: ${BASE_PATH}a/`,
      `index.html: ${BASE_PATH}b.css`,
      `index.html: ${BASE_PATH}c.png`,
      `index.html: ${BASE_PATH}d.js`,
    ]);
  });

  it('reports a missing target with the page file', () => {
    write('items/index.html', `<a href="${BASE_PATH}gone/">Gone</a>`);
    expect(checkLinks(dist)).toEqual([`items/index.html: ${BASE_PATH}gone/`]);
  });

  it('reports a URL with no trailing slash that points to a folder', () => {
    write('items/index.html');
    pageWith(`<a href="${BASE_PATH}items">Items</a>`);
    expect(checkLinks(dist)).toEqual([`index.html: ${BASE_PATH}items`]);
  });

  it('ignores URLs outside the base path', () => {
    pageWith('<a href="https://example.com/x">X</a><a href="/other/">Y</a>');
    expect(checkLinks(dist)).toEqual([]);
  });
});
