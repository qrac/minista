export type Awaitable<T> = T | Promise<T>

export type JsonPrimitive = string | number | boolean | null
export type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[]

export type Brand<Value, Name extends string> = Value & {
  readonly __brand: Name
}

export type ProjectPath = Brand<string, "ProjectPath">
export type Capability = Brand<string, "Capability">

export const BUILD_PHASES = [
  "discover",
  "resolve",
  "render",
  "analyze",
  "generate",
  "bundle",
  "compose",
  "emit",
  "finalize",
] as const

export type BuildPhase = (typeof BUILD_PHASES)[number]
