#!/usr/bin/env node

const webpack = require("webpack")
const webpackConfig = require("./webpack.config")

webpack(webpackConfig).run((err, stats) => {
  err && console.log(err)
  stats &&
    console.log(
      stats.toString({
        colors: true,
      })
    )
})
