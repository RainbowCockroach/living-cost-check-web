import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this project at username.github.io/living-cost-check-web/.
// The base path must match the repo name so built asset URLs resolve correctly.
export default defineConfig({
  plugins: [react()],
  base: '/living-cost-check-web/',
});
