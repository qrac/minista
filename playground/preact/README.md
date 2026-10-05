# Preact playground

A React counter with `client:load`, using
[`@preact/preset-vite`](https://github.com/preactjs/preset-vite) for browser
development and production. Component imports stay unchanged. Minista still
uses React for static HTML generation.

From the repository root:

```sh
npm run play:preact
npm run play-build:preact
npm run play-preview:preact
```

## Why the preset needs a wrapper

The wrapper lives in `.vite-plugins/preact.ts`. `vite.config.ts` adds it through
`pluginPreact()`, alongside `pluginSsg()` and `pluginIsland()`.

Adding `preact()` directly changes JSX and React imports for server modules too.
In this playground, that fails during SSG with `MINISTA_RENDER_FAILED`: Preact
elements reach Minista's React renderer and are rejected as invalid children.

The configuration keeps the preset's JSX import source as `react` and disables
its global React aliases. Preset plugins run only in the client environment,
where a resolver redirects React and JSX imports to Preact. Vite aliases are
shared across environments, so this resolver uses `applyToEnvironment` instead
of global aliases. The dev dependency optimizer excludes React entrypoints and
pre-bundles Preact compat entrypoints, avoiding a mix of React and Preact in the
browser. These adjustments are local to this playground; Minista's renderer is
unchanged.

## Verification

Verified with `@preact/preset-vite` 2.10.6, Preact 11.0.0, and Vite 8.3.2 on
October 5, 2026:

- Production build succeeds, keeping React for SSG and Preact for Island JS.
- The counter increments in dev and production preview, with no browser
  warnings or errors observed.
- Editing the counter updates the page through a full reload, resetting its
  state. Although the preset includes Prefresh, state preservation through HMR
  was not observed in this example.

This is a minimal counter example, not a guarantee of compatibility with every
React API or dependency.
