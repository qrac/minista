const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const CopyPlugin = require("copy-webpack-plugin")

const webpackConfig = {
  devServer: {
    open: ["/index.html"],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "assets/custom.css",
    }),
    new CopyPlugin({
      patterns: [{ from: "./static", to: "./", noErrorOnMissing: true }],
    }),
  ],
}

module.exports = webpackConfig
