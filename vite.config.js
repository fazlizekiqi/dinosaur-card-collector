import { defineConfig } from 'vite'

export default defineConfig({
    base: '/dinosaur-card-collector/', // use your GitHub repo name here
    build: {
        assetsInlineLimit: 0, // disable inlining entirely
        outDir: 'dist',
    }
})