import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Renewable-Generation/',
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
    open: false,
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
        },
      },
    },
  },
});
