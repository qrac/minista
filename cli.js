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
    beautifyHTML()
  })

//----------------------------------------------------
// Beautify
//----------------------------------------------------

const fs = require("fs")
const glob = require("glob")
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
    return webpackWatch()
  case "build":
    return webpackBuild()
  default:
    return console.log("Command error!\nminista dev or minista build")
}
