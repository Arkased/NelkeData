import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
    pageWith('<a href="/NelkeData/items/">Items</a><a href="/NelkeData/">Home</a>');
    expect(checkLinks(dist)).toEqual([]);
  });

  it('removes the query and the fragment', () => {
    write('items/index.html');
    write('app.css');
    pageWith('<a href="/NelkeData/items/?q=1#top">A</a><link href="/NelkeData/app.css?v=2" rel="stylesheet" />');
    expect(checkLinks(dist)).toEqual([]);
  });

  it('reads href of a and link and src of img and script', () => {
    pageWith(
      '<a href="/NelkeData/a/">A</a><link href="/NelkeData/b.css" /><img src="/NelkeData/c.png" /><script src="/NelkeData/d.js"></script>',
    );
    expect(checkLinks(dist)).toEqual([
      'index.html: /NelkeData/a/',
      'index.html: /NelkeData/b.css',
      'index.html: /NelkeData/c.png',
      'index.html: /NelkeData/d.js',
    ]);
  });

  it('reports a missing target with the page file', () => {
    write('items/index.html', '<a href="/NelkeData/gone/">Gone</a>');
    expect(checkLinks(dist)).toEqual(['items/index.html: /NelkeData/gone/']);
  });

  it('reports a URL with no trailing slash that points to a folder', () => {
    write('items/index.html');
    pageWith('<a href="/NelkeData/items">Items</a>');
    expect(checkLinks(dist)).toEqual(['index.html: /NelkeData/items']);
  });

  it('ignores URLs outside the base path', () => {
    pageWith('<a href="https://example.com/x">X</a><a href="/other/">Y</a>');
    expect(checkLinks(dist)).toEqual([]);
  });
});
