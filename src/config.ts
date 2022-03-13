import path from "path"
import url from "url"
import { build } from "esbuild"
import commonjsPlugin from "@chialab/esbuild-plugin-commonjs"
import { mergeWithRules, unique } from "webpack-merge"

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = process.env.NODE_ENV !== "production"

export const defaultConfig = {
  outDir: "dist",
  publicDir: "public",
  assetsDir: "assets",
  minify: true,
  esbuild: true,
}

export async function getConfig() {
  const result = await build({
    entryPoints: [path.resolve(__dirname + "/../webpack.config.js")],
    format: "esm",
    platform: "node",
    write: false,
    plugins: [commonjsPlugin()],
  })

  /*const userConfig = await import(path.resolve("./webpack.config.js"))
  const mergedConfig = mergeWithRules([
    {
      entry: "replace",
      module: {
        rules: {
          test: "match",
          use: {
            loader: "match",
            options: "merge",
          },
        },
      },
      optimization: {
        minimizer: "replace",
      },
    },
    {
      //@ts-ignore
      customizeArray: unique(
        "plugins",
        ["MiniCssExtractPlugin", "CopyPlugin"],
        (plugin) => plugin.constructor && plugin.constructor.name
      ),
    },
  ])({}, userConfig)*/
  return result.outputFiles[0].text
}
