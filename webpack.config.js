const fs = require("fs")
const path = require("path")
const glob = require("glob")

const HtmlWebpackPlugin = require("html-webpack-plugin")
const HtmlReplaceWebpackPlugin = require("html-replace-webpack-plugin")
const RemoveEmptyScriptsPlugin = require("webpack-remove-empty-scripts")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const SpriteLoaderPlugin = require("svg-sprite-loader/plugin")
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")
const TerserPlugin = require("terser-webpack-plugin")
const CopyPlugin = require("copy-webpack-plugin")

const isDev = process.env.NODE_ENV !== "production"

const babelJsxOptions = {
  presets: [
    "@babel/preset-env",
    [
      "@babel/preset-react",
      {
        runtime: "automatic",
      },
    ],
  ],
}

const babelTsxOptions = {
  presets: [
    "@babel/preset-env",
    [
      "@babel/preset-react",
      {
        runtime: "automatic",
      },
    ],
    ["@babel/preset-typescript"],
  ],
}

const postcssOptions = {
  plugins: [
    "postcss-import",
    "postcss-flexbugs-fixes",
    "postcss-sort-media-queries",
    "postcss-preset-env",
  ],
}

function switchEntry() {
  const filepath1 = "src/assets/index.js"
  const filepath2 = "src/assets/index.ts"
  const check = fs.existsSync(path.resolve(filepath1))

  if (check) {
    return "./" + filepath1
  } else {
    return "./" + filepath2
  }
}

function switchBabelOptions(useTsx) {
  const filename1 = "babel.config.js"
  const filename2 = ".babelrc"
  const check1 = fs.existsSync(path.resolve(filename1))
  const check2 = fs.existsSync(path.resolve(filename2))

  const defaultOptions = useTsx ? babelTsxOptions : babelJsxOptions

  if (check1) {
    return require(path.resolve(filename1))
  } else if (check2) {
    return JSON.parse(fs.readFileSync(path.resolve(filename2), "utf8"))
  } else {
    return defaultOptions
  }
}

function switchPostcssOptions() {
  const filename = "postcss.config.js"
  const check = fs.existsSync(path.resolve(filename))

  const defaultOptions = postcssOptions

  if (check) {
    return require(path.resolve(filename))
  } else {
    return defaultOptions
  }
}

const webpackConfig = {
  target: "web",
  mode: isDev ? "development" : "production",
  devtool: isDev ? "source-map" : false,
  devServer: {
    hot: false,
    devMiddleware: {
      publicPath: "/",
      stats: {
        //preset: "errors-only",
      },
    },
    static: {
      directory: path.resolve("public"),
      publicPath: "/",
      watch: true,
    },
  },
  watchOptions: {
    ignored: ["**/.git/**", "**/node_modules/**"],
  },
  entry: { bundle: switchEntry() },
  output: {
    path: path.resolve("dist"),
    publicPath: "/",
    filename: "assets/[name].js",
    assetModuleFilename: "assets/images/[name][ext]",
  },
  module: {
    rules: [
      {
        test: /\.js(|x)$/,
        use: [
          {
            loader: "babel-loader",
            options: switchBabelOptions(),
          },
        ],
      },
      {
        test: /\.ts(|x)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: switchBabelOptions(true),
          },
          {
            loader: "ts-loader",
            options: { transpileOnly: true },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              sourceMap: isDev,
              importLoaders: 1,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              sourceMap: isDev,
              postcssOptions: switchPostcssOptions(),
            },
          },
        ],
      },
      {
        test: /\.(sass|scss)$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              sourceMap: isDev,
              importLoaders: 2,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              sourceMap: isDev,
              postcssOptions: switchPostcssOptions(),
            },
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: isDev,
              sassOptions: {
                outputStyle: isDev ? "expanded" : "",
              },
            },
          },
        ],
      },
      {
        test: /\.(woff2?|eot|ttf|otf)$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/fonts/[name][ext]",
        },
      },
      {
        test: /icons\/.*\.svg$/,
        use: [
          {
            loader: "svg-sprite-loader",
            options: {
              extract: true,
              spriteFilename: "assets/icons.svg",
              runtimeCompat: true,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlReplaceWebpackPlugin([
      {
        pattern: /<div class="minista-comment">(.+?)<\/div>/g,
        replacement: "<!-- $1 -->",
      },
    ]),
    new RemoveEmptyScriptsPlugin(),
    new MiniCssExtractPlugin({
      filename: "assets/[name].css",
    }),
    new SpriteLoaderPlugin({
      plainSprite: true,
    }),
    new CopyPlugin({
      patterns: [
        {
          from: "./public",
          to: path.resolve("dist"),
          noErrorOnMissing: true,
          info: { minimized: true },
        },
      ],
    }),
  ],
  optimization: {
    minimize: !isDev,
    minimizer: [
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            "default",
            {
              cssDeclarationSorter: false,
            },
          ],
        },
      }),
      new TerserPlugin({}),
    ],
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
}

glob
  .sync("**/*.{js,jsx,ts,tsx}", {
    cwd: "src/pages",
  })
  .forEach((file) => {
    const extname = path.extname(file)
    const basename = path.basename(file, extname)
    const dirname = path.dirname(file)

    webpackConfig.plugins.push(
      new HtmlWebpackPlugin({
        template: path.resolve("src/pages", file),
        filename: path.join(dirname, basename + ".html"),
      })
    )
  })

module.exports = webpackConfig
