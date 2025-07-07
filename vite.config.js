import { defineConfig } from 'vite'

export default defineConfig({
    build: {
        assetsInlineLimit: 0, // disable inlining entirely
        outDir: 'dist',
    }
})