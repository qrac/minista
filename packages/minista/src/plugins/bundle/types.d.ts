export type PluginOptions = {
  useExportCss: boolean
  src: string[]
  outName: string
}
export type UserPluginOptions = Partial<PluginOptions>
