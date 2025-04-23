/** @typedef {import('./types').PluginOptions} PluginOptions */

/** @type {PluginOptions} */
export const defaultOptions = {
  src: [
    "/src/layouts/index.{tsx,jsx}",
    "/src/pages/**/*.{tsx,jsx}",
    "!/src/pages/**/*.mpa.{tsx,jsx}",
    "!/src/pages/**/*.enhance.{tsx,jsx}",
    "!/src/pages/**/*.stories.{tsx,jsx}",
  ],
  outName: "bundle",
}
