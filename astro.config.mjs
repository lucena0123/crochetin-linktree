import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
    site: 'https://crochetin.com.br',
    integrations: [sitemap({ filter: (page) => !page.includes('/obrigada') })],
    output: 'static',
    build: {
        assets: 'assets'
    },
    vite: {
        build: {
            cssMinify: true,
            minify: 'terser'
        }
    }
});
