/** @typedef {import('./types').PluginOptions} PluginOptions */

/** @type {PluginOptions} */
export const defaultOptions = {
  layout: "/src/layouts/index.{tsx,jsx}",
  src: ["/src/pages/**/*.{tsx,jsx,mdx,md}"],
  srcBases: ["/src/pages"],
}
