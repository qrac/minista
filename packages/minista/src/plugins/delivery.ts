import type { Plugin } from "vite"

import type { ResolvedConfig } from "../config/index.js"

export function pluginDelivery(config: ResolvedConfig): Plugin {
  let command: "build" | "serve"

  return {
    name: "minista-vite-plugin:delivery",
    config(_, viteConfig) {
      command = viteConfig.command
    },
    async transform(code, id) {
      if (
        command === "serve" &&
        id.match(/minista(\/|\\)dist(\/|\\)shared(\/|\\)delivery\.js$/)
      ) {
        const importCode = `import { deliveryItems } from "virtual:minista-plugin-serve"`
        const replacedCode = code.replace(
          /const deliveryItems/,
          "//const deliveryItems"
        )
        return {
          code: importCode + "\n\n" + replacedCode,
          map: null,
        }
      }
    },
  }
}
