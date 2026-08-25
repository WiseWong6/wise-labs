import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2022',
    modulePreload: {
      polyfill: false,
    },
  },
})
