const webpackConfig = {
  devServer: {
    open: ["/index.html"],
  },
  entry: { bundle: "./src/assets/index.ts" },
}

module.exports = webpackConfig
