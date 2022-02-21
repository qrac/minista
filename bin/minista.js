#!/usr/bin/env node
"use strict"

if (typeof __dirname !== "undefined") {
  const version = process.versions.node
  console.error(`\nNode.js v${version} is not supported by minista
Please upgrade to a version of Node.js with complete ESM support: "^14.15.0 || >=16.0.0"\n`)
} else {
  import("../dist/cli.js")
}
