import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@context': path.resolve(__dirname, 'src/context'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@styles': path.resolve(__dirname, 'src/styles'),
    },
  },
  test: {
    globals: true,
    // Use happy-dom to avoid jsdom ESM/CJS interop issues in some environments
    environment: 'happy-dom',
    setupFiles: ['src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,tsx,jsx}'],
  },
})
