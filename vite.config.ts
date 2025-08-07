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
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  optimizeDeps: {
    include: ['buffer', 'process']
  },
  build: {
    rollupOptions: {
      define: {
        global: 'globalThis',
      },
      onwarn(warning, warn) {
        // Suppress specific warnings from @privy-io packages
        if (warning.code === 'INVALID_ANNOTATION' && warning.message.includes('@privy-io')) {
          return;
        }
        // Suppress unresolved dependency warnings for react-is
        if (warning.code === 'UNRESOLVED_IMPORT' && warning.message.includes('react-is')) {
          return;
        }
        warn(warning);
      }
    }
  }
}));
