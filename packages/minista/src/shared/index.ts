export * from "./define.js"
export * from "./comment.js"
export * from "./head.js"
export * from "./icon.js"
export * from "./markdown.js"
export * from "./search.js"

export type Location = {
  pathname: string
}

export type GetStaticData = {
  (): Promise<StaticData>
}

export type StaticData = {
  props: { [key: string]: string }
  paths?: { [key: string]: string }
}
