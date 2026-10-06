export declare class DevRenderCache<Rendered> {
  get(pageId: string, render: () => Promise<Rendered>): Promise<Rendered>
  invalidate(pageIds?: Iterable<string>): void
  retain(pageIds: Iterable<string>): void
}
