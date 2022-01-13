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

function switchPostcssConfig() {
  const filename = "postcss.config.js"
  fs.existsSync(path.resolve(filename)) ? undefined : filename
}

function switchBabelOptions() {
  const filename1 = "babel.config.js"
  const filename2 = ".babelrc"
  const check1 = fs.existsSync(path.resolve(filename1))
  const check2 = fs.existsSync(path.resolve(filename2))

  if (check1) {
    return require(path.resolve(filename1))
  } else if (check2) {
    return JSON.parse(fs.readFileSync(path.resolve(filename2), "utf8"))
  } else {
    return JSON.parse(fs.readFileSync(__dirname + "/" + filename2, "utf8"))
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
  entry: { bundle: "./src/assets/index.js" },
  output: {
    path: path.resolve("dist"),
    publicPath: "/",
    filename: "assets/[name].js",
    assetModuleFilename: "assets/images/[name].[ext]",
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
              postcssOptions: { config: switchPostcssConfig() },
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
              postcssOptions: { config: switchPostcssConfig() },
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
          filename: "assets/fonts/[name].[ext]",
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
        { from: "./public", to: path.resolve("dist"), noErrorOnMissing: true },
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
    extensions: [".js", ".jsx"],
  },
}

glob
  .sync("**/*.js", {
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
