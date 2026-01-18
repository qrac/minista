export type PluginOptions = {
  src: string[]
  outName: string
  useExportCss: boolean
}
export type UserPluginOptions = Partial<PluginOptions>
