import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const BASE = '/NelkeData/';
const LINK_SELECTORS = [
  { selector: 'a', attribute: 'href' },
  { selector: 'link', attribute: 'href' },
  { selector: 'img', attribute: 'src' },
  { selector: 'script', attribute: 'src' },
];

/**
 * Lists the `.html` files under a folder, recursively.
 * @param dir - the folder to scan
 * @returns the absolute paths of the files
 * @sideEffects reads the file system
 */
function listHtml(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listHtml(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

/**
 * Finds the file that a URL under the base path points to.
 * @param url - a URL that starts with the base path
 * @param distDir - the build output folder
 * @returns the path of the target file
 * @sideEffects none
 */
function targetOf(url: string, distDir: string): string {
  const path = decodeURIComponent(url.slice(BASE.length).replace(/[?#].*$/, ''));
  return join(distDir, path.endsWith('/') || path === '' ? `${path}index.html` : path);
}

/**
 * Checks each internal link of the built pages.
 * @param distDir - the build output folder
 * @returns 1 line `<page file>: <url>` for each URL with no target file
 * @sideEffects reads the file system
 */
export function checkLinks(distDir: string): string[] {
  const missing: string[] = [];
  for (const file of listHtml(distDir)) {
    const root = parse(readFileSync(file, 'utf8'));
    for (const { selector, attribute } of LINK_SELECTORS) {
      for (const element of root.querySelectorAll(selector)) {
        const url = element.getAttribute(attribute);
        if (!url?.startsWith(BASE)) continue;
        const target = targetOf(url, distDir);
        if (!existsSync(target) || !statSync(target).isFile()) {
          missing.push(`${relative(distDir, file).split(sep).join('/')}: ${url}`);
        }
      }
    }
  }
  return missing;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const distDir = process.argv[2] ?? join(import.meta.dirname, '..', 'dist');
  const missing = checkLinks(distDir);
  for (const line of missing) console.log(line);
  process.exitCode = missing.length > 0 ? 1 : 0;
}
