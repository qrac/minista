export type UserPluginOptions = {
  src?: string[]
  outName?: string
}

export type PluginOptions = {
  src: string[]
  outName: string
}

export const defaultOptions: PluginOptions = {
  src: [
    "/src/layouts/index.{tsx,jsx}",
    "/src/pages/**/*.{tsx,jsx}",
    "!/src/pages/**/*.mpa.{tsx,jsx}",
    "!/src/pages/**/*.enhance.{tsx,jsx}",
    "!/src/pages/**/*.stories.{tsx,jsx}",
  ],
  outName: "bundle",
}
