# minista

## Site & Documentation

- https://minista.qranoko.jp

## About

minista is a static site generator for building 100% static websites with React JSX and Vite.

## Concept

- **Write everything in JSX and generate clean HTML!**
- Bring JSX-based component development to web production workflows that require static HTML
- Use TypeScript with excellent editor support instead of proprietary syntax

## Features

- All features are provided as Vite plugins
- Uses the Vite Environment API to build the `render` and `client` environments sequentially
- Outputs route, page, asset, and diagnostic data as JSON files in `.minista`

## Setup

Requires Node.js 20.19 or later, or 22.12 or later, Vite 8.1 or later, and React / React DOM 19 or later. Using the latest Vite minor release is recommended.

### Automatic

```sh
npm create minista@latest
```

### Manual

```sh
npm install --save-dev minista vite react react-dom
touch ./vite.config.js
mkdir -p ./src/pages
touch ./src/pages/index.jsx
```

```js
// ./vite.config.js
import { pluginSsg } from "minista"

export default {
  plugins: [pluginSsg()],
}
```

```jsx
// ./src/pages/index.jsx
export default function () {
  return <h1>Hello!</h1>
}
```

Open `package.json` and add the following scripts:

```json
{
  "scripts": {
    "dev": "minista",
    "build": "minista build",
    "preview": "minista preview"
  }
}
```

## CLI

| Command                            | Description                                              |
| ---------------------------------- | -------------------------------------------------------- |
| `minista [root]`                   | Start development mode (`Ctrl + C` to stop)              |
| `minista build [root]`             | Generate the static build using Vite                     |
| `minista preview [root]`           | Preview the generated static build                       |
| `minista check [root]`             | Validate routes, pages, and `getStaticData()`            |
| `minista inspect [root]`           | Show an overview of the Project Graph                    |
| `minista agents [root]`            | Show the agent guide, or add instructions with `--write` |
| `minista explain <node-id> [root]` | Explain the relationships of a Graph node                |

`check`, `inspect`, and `explain` support `--json`.

To inspect only the generated `manifest.json` in the workspace after a build, use:

```sh
minista inspect --manifest --json
```

The v4 `--oneBuild` option was removed in v5. Using it exits with `MINISTA_CLI_OPTION_REMOVED`. The standard `minista build` command builds the `render` and `client` environments through Vite.

## Config

All [Vite configuration options](https://vite.dev/config/) are available.

Both `vite.config.{ts,js}` and `minista.config.{ts,js}` are supported, and you can also use `defineConfig`.

```ts
// ./vite.config.ts
import { defineConfig, pluginSsg } from "minista"

export default defineConfig({
  plugins: [pluginSsg()],
})
```

minista uses the Vite Environment API to build the `render` and `client` environments sequentially. Use `environments` when you need environment-specific configuration.

```ts
// ./vite.config.ts
import { defineConfig, pluginSsg } from "minista"

export default defineConfig({
  plugins: [pluginSsg()],
  environments: {
    client: {
      build: { minify: false },
    },
  },
})
```

Configs that reference the existing `isSsrBuild` option fall back to the compatibility builder. See [Config](https://minista.qranoko.jp/docs/config) for details.

If the project root contains a `package.json`, the generated workspace is located at `node_modules/.minista/`. Otherwise, it is located at `.minista/`.

## Plugins

Each minista feature is enabled by adding its bundled plugin to the Vite configuration.

- [pluginSsg](https://minista.qranoko.jp/docs/plugins/ssg): Converts JSX and MDX to static HTML and outputs referenced CSS, JavaScript, and images
- [pluginImage](https://minista.qranoko.jp/docs/plugins/image): Optimizes images and downloads remote images
- [pluginSvg](https://minista.qranoko.jp/docs/plugins/svg): Inlines SVG files into HTML
- [pluginSprite](https://minista.qranoko.jp/docs/plugins/sprite): Generates SVG sprites
- [pluginComment](https://minista.qranoko.jp/docs/plugins/comment): Outputs comments in HTML
- [pluginIsland](https://minista.qranoko.jp/docs/plugins/island): Turns parts of a page into React apps
- [pluginSearch](https://minista.qranoko.jp/docs/plugins/search): Adds full-text search
- [pluginBeautify](https://minista.qranoko.jp/docs/plugins/beautify): Formats HTML, CSS, and JavaScript during the build
- [pluginArchive](https://minista.qranoko.jp/docs/plugins/archive): Generates compressed archives during the build

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)
