import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Production optimizations for Vercel
    minify: mode === 'production' ? 'terser' : 'esbuild',
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true, // Remove console.logs in production builds
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific console methods
      },
    } : undefined,
    rollupOptions: {
      output: {
        // Code splitting for better caching on Vercel CDN
        manualChunks: mode === 'production' ? {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          'chart-vendor': ['recharts'],
          'query-vendor': ['@tanstack/react-query'],
        } : undefined,
        // Optimize chunk file names for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === 'development', // Only sourcemaps in dev
    // Optimize for Vercel's edge network
    target: 'esnext',
    cssCodeSplit: true,
  },
  // Optimize dependencies for faster builds
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
    ],
    // Exclude from optimization (let Vercel handle)
    exclude: [],
  },
  // Vercel automatically handles environment variables via import.meta.env
  // No need to manually define them
}));
