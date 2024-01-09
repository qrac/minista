export type UserPluginOptions = {
  layoutRoot?: string
  src?: string[]
  outDir?: string
}

export type PluginOptions = {
  layoutRoot: string
  src: string[]
  outDir: string
}

export const defaultOptions: PluginOptions = {
  layoutRoot: "/src/layouts/index.{tsx,jsx}",
  src: ["/src/**/*.stories.{tsx,ts,jsx,js,mdx,md}"],
  outDir: "story",
}
