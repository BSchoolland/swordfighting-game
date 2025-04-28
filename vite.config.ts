import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
    host: '0.0.0.0',  // Allow connections from any network interface
    port: 3000,       // Use a specific port for easier access
    strictPort: true  // Fail if port 3000 is not available
  },
  base: './'
}); 