
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
   plugins: [react()],
   resolve: {
      alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@hooks': path.resolve(__dirname, 'src/hooks'), // Correct path to hooks directory
      '@context': path.resolve(__dirname, 'src/context'), // Correct path to context directory
      '@utils': path.resolve(__dirname, 'src/utils'), // Correct path to utils directory
      '@styles': path.resolve(__dirname, 'src/styles'), // Correct path to styles directory
      // '@images': path.resolve(__dirname, 'src/images'), // Correct path to netlify directory

         // src: "/src",
         // ... other aliases
      },
   },
   server: {
     proxy: {
       '/api': 'http://localhost:3001', // or whatever your backend port is
     },
   },
});



// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import path from 'path';

// export default defineConfig({
//   plugins: [react()],
//   resolve: {
//     alias: {
//       '@/components': path.resolve(__dirname, './src/components'),
//       '@lib': path.resolve(__dirname, './src/lib'),
//     },
//   },
// });

// // / <reference types="vite/client" />

// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import dotenv from 'dotenv';
// import path from 'path';

// // https://vitejs.dev/config/
// dotenv.config();

// export default defineConfig({
//   plugins: [react()],
//   resolve: {
//     alias: {
//       // '@controllers': path.resolve(__dirname, './controllers'),
//       // '@utils': path.resolve(__dirname, './utils'),
//       // '@server': path.resolve(__dirname, './src/server'),
//       '@lib': path.resolve(__dirname, './src/lib'),
//       '@/components': path.resolve(__dirname, './src/components'),
//     },
//   },
//   server: {
//     proxy: {
//       '/api': `http://localhost:${process.env.PORT || 3001}`, // Use PORT from .env or default to 3001
//     },
//   },
//   optimizeDeps: {
//     exclude: ['lucide-react'],
//   },
//   define: {
//     'import.meta.env': process.env, // Optional: Ensure environment variables are loaded
//   },
// });

