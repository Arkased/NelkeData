import { defineConfig } from 'astro/config';
import { BASE_PATH, SITE_ORIGIN } from './src/base.js';

export default defineConfig({
  output: 'static',
  site: SITE_ORIGIN,
  base: BASE_PATH,
  trailingSlash: 'always',
});
