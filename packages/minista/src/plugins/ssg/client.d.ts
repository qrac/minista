declare module "*.mdx" {
  const Content: import("react").ComponentType<Record<string, unknown>>
  export default Content
}

declare module "*.md" {
  const Content: import("react").ComponentType<Record<string, unknown>>
  export default Content
}
