export declare class ViteEnvironmentState<State> {
  constructor(create: () => State)
  get(environment?: object | string): State
  delete(environment?: object | string): void
  clear(): void
}
