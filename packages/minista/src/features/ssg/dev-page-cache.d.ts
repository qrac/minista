export declare class DevPageCache<Snapshot> {
  get(load: () => Promise<Snapshot>): Promise<Snapshot>
  invalidate(): void
}
