export type PluginOptions = {
  useSplitPages: boolean
  outName: string
  rootAttrName: string
  rootDOMElement: "div" | "span"
  rootStyle: React.CSSProperties
}
export type UserPluginOptions = Partial<PluginOptions>
