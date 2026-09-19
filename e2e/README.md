# AWS E2E smoke tests

The default Playwright run collects only `*.aws.spec.ts`. These tests cover the
currently supported AWS-backed application and run in both desktop and mobile
Chromium projects.

```bash
npx playwright install chromium
npm run test:e2e
```

In CI, Playwright starts `vite preview` and tests the exact production build.
Locally it starts the Vite development server on port 8080.

**Under `CI=1`, the browser loads `dist/`, not your working tree.** An edit to
`src/` reaches the page only after `npm run build`. This matters most when
falsifying a spec: deleting the behaviour a test guards and watching it still
pass reads exactly like a test that does not work, when in fact the browser
never saw the deletion. Rebuild between the mutation and the run, or falsify
against the dev server.

The older `*.spec.ts` files remain as migration reference, but they are
quarantined by `testMatch` because they target removed Supabase-era routes and
must not be treated as release coverage. Any restored flow should be rewritten
as a deterministic `*.aws.spec.ts` test with explicit assertions and API mocks
or seeded test data.
