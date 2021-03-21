#!/usr/bin/env node

//----------------------------------------------------
// Variables
//----------------------------------------------------

const dev = process.argv[2] != "build"
process.env.NODE_ENV = dev ? "development" : "production"

//----------------------------------------------------
// webpack
//----------------------------------------------------

const webpack = require("webpack")
const webpackConfig = require("./webpack.config")
const webpackCompiler = webpack(webpackConfig)

const webpackWatch = () =>
  webpackCompiler.watch({}, (err, stats) => {
    err && console.log(err)
    stats &&
      console.log(
        stats.toString({
          colors: true,
        })
      )
  })

const webpackBuild = () =>
  webpackCompiler.run((err, stats) => {
    err && console.log(err)
    stats &&
      console.log(
        stats.toString({
          colors: true,
        })
      )
  })

//----------------------------------------------------
// Actions
//----------------------------------------------------

switch (process.argv[2]) {
  case undefined:
  case "dev":
    return webpackWatch()
  case "build":
    return webpackBuild()
  default:
    return console.log("Command error!\nminista dev or minista build")
}
