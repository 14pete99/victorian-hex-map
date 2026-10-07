import { defineConfig } from 'vitest/config';

// Tests live outside src/map/ so that folder stays the ten files people copy.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
