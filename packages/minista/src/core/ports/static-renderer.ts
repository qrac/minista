export interface StaticRenderInput<Tree = unknown> {
  readonly tree: Tree
  readonly pageId: string
  readonly url: string
}

export interface StaticRenderResult {
  readonly html: string
  readonly metadata?: Readonly<Record<string, unknown>>
}

export interface StaticRenderer<Tree = unknown> {
  render(input: StaticRenderInput<Tree>): Promise<StaticRenderResult>
}
