#!/usr/bin/env node
const fs = require("fs")
const path = require("path")
const glob = require("glob")
const webpack = require("webpack")
const { mergeWithRules, unique } = require("webpack-merge")
const webpackDevServer = require("webpack-dev-server")
const beautify = require("js-beautify")

function getWebpackConfig() {
  return require("./webpack.config")
}

function getUserWebpackConfig() {
  if (fs.existsSync(path.resolve("webpack.config.js"))) {
    return require(path.resolve("webpack.config"))
  } else {
    return {}
  }
}

function getMergedWebpackConfig({ config, userConfig }) {
  const mergedConfig = mergeWithRules({
    optimization: {
      minimizer: "replace",
    },
    customizeArray: unique(
      "plugins",
      ["MiniCssExtractPlugin", "CopyPlugin"],
      (plugin) => plugin.constructor && plugin.constructor.name
    ),
  })(config, userConfig)
  console.log(mergedConfig)
  const filterdPlugins = filterWebpackPlugins({
    plugins: mergedConfig.plugins,
  })
  mergedConfig.plugins = filterdPlugins
  return mergedConfig
}

function filterWebpackPlugins({ plugins }) {
  const filterdHtmlWebpackPlugins = filterHtmlWebpackPlugins({
    plugins: plugins,
  })
  const filteredOtherWebpackPlugins = filterOtherWebpackPlugins({
    plugins: plugins,
  })
  return [...filterdHtmlWebpackPlugins, ...filteredOtherWebpackPlugins]
}

function filterHtmlWebpackPlugins({ plugins }) {
  const htmlWebpackPlugins = plugins.filter(
    (plugin) => plugin.constructor.name === "HtmlWebpackPlugin"
  )
  const mergedHtmlWebpackPlugins = [
    ...new Map(
      htmlWebpackPlugins.map((plugin) => [plugin.userOptions.filename, plugin])
    ).values(),
  ]
  return mergedHtmlWebpackPlugins
}

function filterOtherWebpackPlugins({ plugins }) {
  const otherPlugins = plugins.filter(
    (plugin) => plugin.constructor.name !== "HtmlWebpackPlugin"
  )
  return otherPlugins
}

function beautifyHtmlFiles({
  htmlFilesPath,
  beautifyOptions = {
    indent_size: 2,
    max_preserve_newlines: 0,
  },
}) {
  glob.sync(htmlFilesPath).forEach((file) => {
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

function webpackBuildWithBeautify({
  webpackCompiler,
  runBeautify = true,
  htmlFilesPath,
}) {
  webpackCompiler.run((err, stats) => {
    err && console.log(err)
    stats &&
      console.log(
        stats.toString({
          colors: true,
        })
      )
    runBeautify && beautifyHtmlFiles({ htmlFilesPath: htmlFilesPath })
  })
}

function ministaCommand({
  process,
  webpackCompiler,
  webpackDevServerOptions,
  runBeautify,
  htmlFilesPath,
}) {
  if (process.argv[2] === undefined || process.argv[2] === "dev") {
    const webpackDev = new webpackDevServer(
      webpackDevServerOptions,
      webpackCompiler
    )
    return webpackDev.start()
  } else if (process.argv[2] === "build") {
    return webpackBuildWithBeautify({
      webpackCompiler: webpackCompiler,
      runBeautify: runBeautify,
      htmlFilesPath: htmlFilesPath,
    })
  } else {
    return console.log("Command error!\nminista dev or minista build")
  }
}

const isDev = process.argv[2] !== "build"
process.env.NODE_ENV = isDev ? "development" : "production"

const webpackConfig = getWebpackConfig()
const userWebpackConfig = getUserWebpackConfig()
const mergedWebpackConfig = getMergedWebpackConfig({
  config: webpackConfig,
  userConfig: userWebpackConfig,
})
const webpackCompiler = webpack(mergedWebpackConfig)
const webpackDevServerOptions = Object.assign({}, mergedWebpackConfig.devServer)

ministaCommand({
  process: process,
  webpackCompiler: webpackCompiler,
  webpackDevServerOptions: webpackDevServerOptions,
  runBeautify: true,
  htmlFilesPath: "dist/**/*.html",
})
