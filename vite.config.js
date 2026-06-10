import { defineConfig } from 'vite'

export default defineConfig({
    base: '/pokemon-card-collector/pokemon-collector/', // pokemon-collector branch subfolder
    build: {
        assetsInlineLimit: 0, // disable inlining entirely
        outDir: 'dist',
    }
})