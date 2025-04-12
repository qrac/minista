/** @typedef {import('./types').PluginOptions} PluginOptions */

/** @type {PluginOptions} */
export const defaultOptions = {
  layoutRoot: "/src/layouts/index.{tsx,jsx}",
  src: [
    "/src/pages/**/*.{tsx,jsx,mdx,md}",
    "!/src/pages/**/*.mpa.{tsx,jsx}",
    "!/src/pages/**/*.enhance.{tsx,jsx}",
    "!/src/pages/**/*.stories.{tsx,jsx,mdx,md}",
  ],
  srcBases: ["/src/pages"],
}
