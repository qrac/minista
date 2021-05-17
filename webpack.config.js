const path = require("path")
const glob = require("glob")

const HtmlWebpackPlugin = require("html-webpack-plugin")
const HtmlReplaceWebpackPlugin = require("html-replace-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")
const TerserPlugin = require("terser-webpack-plugin")
const CopyPlugin = require("copy-webpack-plugin")

const isDev = process.env.NODE_ENV !== "production"

const webpackConfig = {
  mode: isDev ? "development" : "production",
  devtool: isDev ? "source-map" : false,
  devServer: {
    inline: true,
    //hot: true,
    //hotOnly: true,
    contentBase: [path.resolve("public"), path.resolve("static")],
    //contentBasePublicPath: "/",
    //publicPath: "/assets/",
    watchContentBase: true,
    watchOptions: {
      ignored: "**/node_modules",
    },
    //writeToDisk: true,
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
              presets: ["@babel/preset-env", "@babel/react"],
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
              sourceMap: isDev,
              importLoaders: 1,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              sourceMap: isDev,
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
    new HtmlReplaceWebpackPlugin([
      {
        pattern: /<div class="minista-comment">(.+?)<\/div>/g,
        replacement: "<!-- $1 -->",
      },
    ]),
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
    minimize: !isDev,
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
