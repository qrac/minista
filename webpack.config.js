const path = require("path")
const glob = require("glob")

const HtmlWebpackPlugin = require("html-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")
const TerserPlugin = require("terser-webpack-plugin")
const CopyPlugin = require("copy-webpack-plugin")

const dev = process.env.NODE_ENV != "production"

const webpackConfig = {
  mode: dev ? "development" : "production",
  watchOptions: {
    ignored: "**/node_modules",
  },
  entry: "./src/assets/index.js",
  output: {
    path: path.resolve("dist"),
    filename: "assets/scripts.js",
  },
  module: {
    rules: [
      {
        test: /\.js(|x)$/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: ["@babel/react"],
            },
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
              sourceMap: dev,
              importLoaders: 1,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              sourceMap: dev,
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
              sourceMap: dev,
              importLoaders: 2,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              sourceMap: dev,
            },
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: dev,
              sassOptions: {
                outputStyle: dev ? "expanded" : "",
              },
            },
          },
        ],
      },
      {
        test: /\.(woff2?|eot|ttf|otf)$/i,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "assets/fonts",
              publicPath: "./fonts/",
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "assets/styles.css",
    }),
    new CopyPlugin({
      patterns: [
        { from: "./public", to: path.resolve("dist"), noErrorOnMissing: true },
        { from: "./static", to: path.resolve("dist"), noErrorOnMissing: true },
      ],
    }),
  ],
  optimization: {
    minimize: !dev,
    minimizer: [new CssMinimizerPlugin({}), new TerserPlugin({})],
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
