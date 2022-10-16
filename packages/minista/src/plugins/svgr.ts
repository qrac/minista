import type { Plugin } from "vite"
import type { Config as SvgrOptions } from "@svgr/core"
import fs from "fs-extra"
import { transformWithEsbuild } from "vite"

/*! Fork: vite-plugin-svgr | https://github.com/pd4d10/vite-plugin-svgr */
export function pluginSvgr(svgrOptions: SvgrOptions): Plugin {
  return {
    name: "minista-vite-plugin:svgr",
    async transform(code, id) {
      if (id.endsWith(".svg")) {
        const { transform: transformSvgr } = await import("@svgr/core")
        const svgCode = await fs.readFile(id, "utf8")
        const componentCode = await transformSvgr(svgCode, svgrOptions, {
          filePath: id,
          caller: {
            previousExport: code,
          },
        })
        const res = await transformWithEsbuild(componentCode, id, {
          loader: "jsx",
        })
        return {
          code: res.code,
          map: null,
        }
      }
    },
  }
}