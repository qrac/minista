import type { SvgSpriteConfig } from "../@types/node.js"

type SingleOptions = {
  spriteKey: string
  srcDir: string
  outName: string
  config?: SvgSpriteConfig
}

export type UserPluginOptions = {
  multiple?: SingleOptions[]
} & Partial<Omit<SingleOptions, "spriteKey">>

export type PluginOptions = {
  multiple: SingleOptions[]
} & Omit<SingleOptions, "spriteKey">

export const defaultOptions: PluginOptions = {
  srcDir: "src/assets/sprite",
  outName: "sprite",
  config: {},
  multiple: [],
}

export function resolveMultipleOptions(opts: PluginOptions): SingleOptions[] {
  return [
    {
      spriteKey: "",
      srcDir: opts.srcDir,
      outName: opts.outName,
      config: opts.config,
    },
    ...opts.multiple.map((item) => ({
      spriteKey: item.spriteKey,
      srcDir: item.srcDir,
      outName: item.outName,
      config: item.config || opts.config,
    })),
  ]
}
