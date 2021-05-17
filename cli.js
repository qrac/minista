#!/usr/bin/env node

//----------------------------------------------------
// Global Require
//----------------------------------------------------

const fs = require("fs")
const path = require("path")
const glob = require("glob")

//----------------------------------------------------
// Variables
//----------------------------------------------------

const isDev = process.argv[2] !== "build"
process.env.NODE_ENV = isDev ? "development" : "production"

//----------------------------------------------------
// webpack
//----------------------------------------------------

const webpack = require("webpack")
const webpackDevServer = require("webpack-dev-server")
const webpackConfig = require("./webpack.config")
const webpackCompiler = webpack(webpackConfig)
const devServerOptions = Object.assign(
  {},
  {
    contentBase: path.join(path.resolve(), "src"),
  }
)

const webpackDev = () => new webpackDevServer(webpackCompiler, devServerOptions)

const webpackBuild = () =>
  webpackCompiler.run((err, stats) => {
    err && console.log(err)
    stats &&
      console.log(
        stats.toString({
          colors: true,
        })
      )
    beautifyHTML()
  })

//----------------------------------------------------
// Beautify
//----------------------------------------------------

const beautify = require("js-beautify")
const beautifyOptions = {
  indent_size: 2,
  max_preserve_newlines: 0,
}

const beautifyHTML = () => {
  glob.sync("dist/**/*.html").forEach((file) => {
    fs.readFile(file, "utf8", (err, html) => {
      if (err) console.log(err)
      if (err) return

      const result = beautify.html(html, beautifyOptions)

      fs.writeFile(file, result, "utf8", (err) => {
        if (err) console.log(err)
      })
    })
  })
}

//----------------------------------------------------
// Actions
//----------------------------------------------------

switch (process.argv[2]) {
  case undefined:
  case "dev":
    return webpackDev().listen(8080)
  case "build":
    return webpackBuild()
  default:
    return console.log("Command error!\nminista dev or minista build")
}
