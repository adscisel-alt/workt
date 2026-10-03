import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  // three + drei + postprocessing trafiają do osobnego, leniwie ładowanego fragmentu (widok 3D)
  build: { chunkSizeWarningLimit: 1600 },
  test: {
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
