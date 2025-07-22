import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // Optimize JSX runtime
      jsxRuntime: 'automatic'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
    },
  },
  server: {
    port: 5173,
    // Proxy disabled while using mock API
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:3002',
    //     changeOrigin: true,
    //   },
    // },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-table',
      'axios'
    ],
    exclude: [
      'chart.js',
      'react-chartjs-2'
    ]
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Bundle optimization
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'table-vendor': ['@tanstack/react-table'],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'utils': ['axios']
        },
        // Optimize chunk file names for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    // Minification and tree shaking
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console.log in production for debugging
        drop_debugger: true,
        pure_funcs: []
      },
      mangle: {
        safari10: true
      }
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable tree shaking
    target: 'esnext',
    // Optimize dependencies
    commonjsOptions: {
      include: [/node_modules/]
    }
  },
  define: {
    // Define environment variables for production
    __API_URL__: mode === 'production' 
      ? JSON.stringify('')
      : JSON.stringify('http://localhost:3001')
  }
}));