import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: { devSourcemap: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('@tiptap')) return 'editor';
            if (id.includes('recharts')) return 'charts';
            if (id.includes('@dnd-kit')) return 'dnd';
            if (id.includes('react-big-calendar')) return 'calendar';
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    proxy: {
      '/api/resend': {
        target: 'https://api.resend.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/resend/, ''),
      },
      '/api/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
