const webpackConfig = {
  devServer: {
    open: ["/index.html"],
  },
  entry: { bundle: "./src/assets/index.js" },
}

module.exports = webpackConfig
