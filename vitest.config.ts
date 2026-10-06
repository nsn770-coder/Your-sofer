import { defineConfig } from 'vitest/config';
import path from 'path';

// Minimal config for the Phase 1 WhatsApp CRM foundation tests. Mirrors the
// `@/*` -> project-root path alias already defined in tsconfig.json so tests
// can import the same way application code does.
export default defineConfig({
  test: {
    include: ['**/__phase1tests__/**/*.test.ts'],
    // app/__tests__/partner-integration.test.ts predates Phase 1: it's a
    // documentation-style file (no vitest imports, hits live endpoints via
    // fetch) rather than a runnable suite. tsconfig.json already excludes it
    // from typecheck; excluding it here too keeps `npm test` from trying to
    // execute it.
    exclude: ['**/node_modules/**', 'app/__tests__/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
