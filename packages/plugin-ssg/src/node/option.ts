export type UserPluginOptions = {
  layoutRoot?: string
  src?: string[]
  srcBases?: string[]
}

export type PluginOptions = {
  layoutRoot: string
  src: string[]
  srcBases: string[]
}

export const defaultOptions: PluginOptions = {
  layoutRoot: "/src/layouts/index.{tsx,jsx}",
  src: [
    "/src/pages/**/*.{tsx,jsx}",
    "!/src/pages/**/*.mpa.{tsx,jsx}",
    "!/src/pages/**/*.enhance.{tsx,jsx}",
    "!/src/pages/**/*.stories.{tsx,jsx}",
  ],
  srcBases: ["/src/pages"],
}
