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

## Smaller bundles with the nano preset

`redact()` uses the `full` preset by default. To disable optional runtime
features, replace `redact()` in `vite.config.ts` with:

```ts
redact({
  preset: "nano",
  features: {
    hydration: true,
  },
})
```

Keep `hydration` enabled for this playground: Minista uses `hydrateRoot()` for
`client:load` Islands to attach behavior to the generated HTML. The nano preset
disables hydration by default, so `redact({ preset: "nano" })` alone causes an
error when the Island starts. Enable other features, such as `context` or
`suspense`, as needed by your components and dependencies. Nano removes behavior;
it is not a full-compatibility preset. See the [upstream bundle-size
notes](https://github.com/TanStack/redact#bundle-size).

Measured on October 5, 2026, with Redact 0.1.4 and Vite 8.3.2, using a temporary
copy of this playground:

| Configuration | Minified JS | Gzip |
| --- | ---: | ---: |
| Full (default) | 62.25 KB | 22.46 KB |
| Nano with hydration | 45.47 KB | 17.31 KB |

Sizes are the sum of all emitted JavaScript assets, with 1 KB = 1,000 bytes.
Gzip sizes are summed after compressing each file separately. Nano with hydration
reduced minified JS by about 27% and gzip size by about 23% in this example.
The nano configuration was verified to build successfully; browser interactions
and dev behavior were not verified with that configuration. The checked-in
configuration continues to use the default full preset.
