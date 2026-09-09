// @ts-check
import { loadDependency } from "../dependencies/js-beautify.js"

/** @typedef {import("../../features/beautify/format.js").OutputFormatter} OutputFormatter */
/** @implements {OutputFormatter} */
export class JsBeautifyFormatter {
  /**
   * @param {import("../../core/artifacts/index.js").EmittedFile} file
   * @param {import("../../features/beautify/format.js").BeautifyFeatureOptions} options
   */
  async format(file, options) {
    if (typeof file.content !== "string") return file
    const { default: beautify } = await loadDependency()
    const content = file.fileName.endsWith(".html")
      ? beautify.html(file.content, options.htmlOptions)
      : file.fileName.endsWith(".css")
        ? beautify.css(file.content, options.cssOptions)
        : beautify.js(file.content, options.jsOptions)
    return Object.freeze({ ...file, content })
  }
}
