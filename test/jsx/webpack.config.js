const webpackConfig = {
  devServer: {
    open: ["/index.html"],
  },
  entry: { custom: "./src/assets/index.js" },
}

module.exports = webpackConfig
