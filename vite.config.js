import { defineConfig } from 'vite'

export default defineConfig({
  // Set the base path for GitHub Pages
  // Replace 'farkle' with your actual repository name
  base: 'https://doiboi.github.io/farkle/',
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Ensure assets are properly organized
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js'
      }
    }
  },
  
  // Development server configuration
  server: {
    port: 3000,
    open: true
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['three', 'cannon-es']
  }
})