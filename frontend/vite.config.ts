import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
   plugins: [react()],
   build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
         input:  path.resolve(__dirname, 'index.html'),
      },
   },
   base: '/',
   resolve: {
      alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@hooks': path.resolve(__dirname, 'src/hooks'), // Correct path to hooks directory
      '@context': path.resolve(__dirname, 'src/context'), // Correct path to context directory
      '@utils': path.resolve(__dirname, 'src/utils'), // Correct path to utils directory
      '@styles': path.resolve(__dirname, 'src/styles'), // Correct path to styles directory
      },
      extensions: ['.js', '.ts', '.jsx', '.tsx'],
   },
   server: {
      proxy: {
         '/api': {
            target: 'http://localhost:8888',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions'),
            secure: false, // Set to false if your local server is not using HTTPS
         },
         // Also proxy direct Netlify Functions paths so code that calls
         // `/.netlify/functions/<fn>` works during local `vite` dev.
         '/.netlify/functions': {
            target: 'http://localhost:8888',
            changeOrigin: true,
            secure: false,
         },
      },
  },
   assetsInclude: ['**/*.svg', '**/*.png'],
});

