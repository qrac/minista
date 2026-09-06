// @ts-check

/**
 * Collect render dependencies in import order. Styles are document resources,
 * so loading them must not depend on executing page modules in the browser.
 *
 * @param {import("vite").ViteDevServer} server
 * @param {readonly string[]} sourceFiles
 * @returns {import("vite").HtmlTagDescriptor[]}
 */
export function getViteDevStyles(server, sourceFiles) {
  const graph = server.environments.ssr.moduleGraph
  /** @type {Set<import("vite").EnvironmentModuleNode>} */
  const seen = new Set()
  const urls = new Set()
  /** @param {import("vite").EnvironmentModuleNode | undefined} module */
  function visit(module) {
    if (!module || seen.has(module)) return
    seen.add(module)
    const id = module.id ?? module.url
    // These imports return data, not an applied stylesheet.
    if (/[?&](?:inline|raw|url)(?:[=&]|$)/.test(id)) return
    if (/\.(?:css|less|sass|scss|styl|stylus|pcss|postcss|sss)(?:\?|$)/i.test(id)) {
      const url = module.url
      // The pre HTML hook passes root-relative URLs to Vite, which applies base.
      urls.add(`${url}${url.includes("?") ? "&" : "?"}direct`)
      return
    }
    for (const dependency of module.importedModules) visit(dependency)
  }
  for (const file of sourceFiles) visit(graph.getModuleById(file))
  return [...urls].map((href) => ({
    tag: "link",
    attrs: { rel: "stylesheet", href },
    injectTo: "head",
  }))
}
