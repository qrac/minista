# Redact playground

A React counter with `client:load`, using the official
[`@tanstack/redact/vite`](https://github.com/TanStack/redact) plugin to replace
browser React imports in development and production. Component imports stay
unchanged. Unlike the Preact playground, conversion is also enabled during dev.

From the repository root:

```sh
npm run play:redact
npm run play-build:redact
npm run play-preview:redact
```

Verified with `@tanstack/redact` 0.1.4 and Vite 8.3.2 on October 5, 2026:

- Production build succeeds; the Island bundle uses Redact.
- The counter increments in both dev and production preview, with no browser
  warnings or errors observed.
- Dev transforms resolve `react` and the JSX runtime to Redact. Editing the
  counter updates the page through a full reload, resetting its state. State
  preservation through Fast Refresh is not verified by this example.

Minista still uses React for static HTML generation: its render environment
externalizes React imports and its static renderer uses `react-dom/static`.
This example verifies browser conversion, not replacing Minista's SSG renderer
with Redact. Redact API availability does not guarantee identical React behavior;
see the upstream compatibility table for limitations.
