// @ts-check

import path from "node:path"

export class ViteDevServerRegistry {
  /** @type {Set<import("vite").ViteDevServer>} */
  #servers = new Set()

  /** @param {import("vite").ViteDevServer} server */
  add(server) {
    this.#servers.add(server)
  }

  /** @param {import("vite").ViteDevServer} server */
  delete(server) {
    this.#servers.delete(server)
  }

  /** @param {import("vite").IndexHtmlTransformContext} context */
  resolve(context) {
    if (context.server && this.#servers.has(context.server)) {
      return context.server
    }
    const servers = [...this.#servers]
    if (servers.length === 1) return servers[0]
    if (!context.filename) return undefined
    const filename = path.resolve(context.filename)
    const candidates = servers.filter((server) => {
      const root = path.resolve(server.config.root)
      const relative = path.relative(root, filename)
      return !relative.startsWith("..") && !path.isAbsolute(relative)
    })
    return candidates.length === 1 ? candidates[0] : undefined
  }

  /** @param {import("vite").Environment} environment */
  resolveEnvironment(environment) {
    const servers = [...this.#servers]
    const exact = servers.filter((server) =>
      /** @type {object[]} */ (Object.values(server.environments ?? {}))
        .includes(environment)
    )
    if (exact.length === 1) return exact[0]
    const root = path.resolve(environment.config.root)
    const candidates = servers.filter((server) =>
      path.resolve(server.config.root) === root
    )
    return candidates.length === 1 ? candidates[0] : undefined
  }
}
