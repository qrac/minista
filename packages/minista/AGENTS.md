# Using minista

This guide describes the installed minista version for application authors.
Use the project's own instructions and configuration alongside this guide.

## Inspect before editing

Run commands from the application root, or pass its path as `[root]`.
Use the installed CLI (for example `npx --no-install minista ...`).

- `minista agents [root] --json`: locate this guide and generated workspace metadata without evaluating configuration or user modules. Paths are absolute local paths.
- `minista inspect [root] --manifest --json`: query the last successful build snapshot without evaluating user modules. This is a summary, not the entire manifest. Read the located manifest for its full catalogs.
- `minista inspect [root] --json`: analyze current source through Vite and execute page modules and `getStaticData()`.
- `minista check [root] --json`: validate current routes/pages with the same module evaluation and save diagnostics.
- `minista explain <node-id> [root] --json`: explain a node from the current source graph; this also evaluates user modules. Use an actual ID returned by inspect.

Snapshots can be missing or stale. A missing manifest returns `MINISTA_MANIFEST_NOT_FOUND`;
build explicitly when a new build snapshot is needed. No query automatically builds.
The manifest describes the last successful build, while diagnostics describe the last
recorded check/build, including failures. They need not describe the same run. Check
`createdAt`, `command`, and `buildId` when present. Snapshot timestamps do not prove
that source files are unchanged. Diagnostics can contain user-code information and
should not be published with the site.

## Configuration and source

Use `vite.config.js` or `vite.config.ts` with `defineConfig` and `pluginSsg` from `minista`.
`minista.config.*` remains a compatibility alias. Do not create both configurations:
multiple detected config files are an error.

```js
import { defineConfig, pluginSsg } from "minista"

export default defineConfig({ plugins: [pluginSsg()] })
```

Pages default to `src/pages/**/*.{tsx,jsx,mdx,md}`. Inspect `pluginSsg` options
(`src`, `srcBases`, `layout`, `mdx`) before assuming a project's directories.
JSX/TSX pages export a default React component. Markdown/MDX support is included
in `pluginSsg`; do not add a separate minista MDX plugin.
`src/pages/index.tsx` maps to `/`, and `src/pages/about.tsx` maps to `/about`.
Dynamic routes such as `[slug]` use `getStaticData()` results with `paths` and
`props`; supply the required path parameters. Exported `metadata` can provide
a title and `draft`; draft pages are excluded from build output.

The default layout is `src/layouts/index.{tsx,jsx}`. Layouts receive
`children` and page props. A layout may return an `html` document with `head`
and `body`, or a fragment. `Head` from `minista/head` composes document head
content. Public page/layout types are available from `minista/types`.

## Assets and browser code

Minista renders static HTML with React. Page components are not automatically
hydrated. Use `pluginIsland` for interactive components; follow existing island
usage and the installed `minista/assets` types instead of assuming a React SPA.

Page/layout imports of CSS and images, and root asset entries such as module
scripts in the document, are handled by `pluginSsg`. Do not add `pluginEntry`.
Public CSS and JavaScript can be used alongside bundled source entries.
Other optional plugins are `pluginImage`, `pluginSvg`, `pluginSprite`,
`pluginComment`, `pluginSearch`, `pluginBeautify`, and `pluginArchive`.
Enable and configure the features the project needs. Public options and types
are shipped beside the JavaScript in the installed package's `src/` directory.

## Generated storage and verification

With a package.json at the application root, generated files live under
`node_modules/.minista/`; otherwise they live under `.minista/` at that root.
Use `minista agents --json` to resolve the location instead of searching
node_modules. Do not edit generated files or use private temporary modules as APIs.
Old root-level snapshots are not read when the new location applies; regenerate
with check/build after upgrading. No automatic deletion of old directories occurs.

After changes, run the project's relevant tests and `minista check --json`.
Run `minista build` for changes affecting rendered output, assets, or build behavior,
and inspect affected pages in dev when changing browser behavior.
The CLI and package use JavaScript source directly; minista itself needs no prior build.
