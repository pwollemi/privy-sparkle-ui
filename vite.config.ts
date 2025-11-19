import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      'Content-Security-Policy': "frame-ancestors 'self' https://lovable.dev https://*.lovableproject.com",
    },
  },
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'crypto', 'stream'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      define: {
        global: 'globalThis',
      },
      onwarn(warning, warn) {
        // Suppress unresolved dependency warnings for react-is
        if (warning.code === 'UNRESOLVED_IMPORT' && warning.message.includes('react-is')) {
          return;
        }
        warn(warning);
      }
    }
  }
}));
