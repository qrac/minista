export declare class DevPageCache<Snapshot> {
  get(load: () => Promise<Snapshot>): Promise<Snapshot>
  peek(): Snapshot | undefined
  invalidate(): void
}
