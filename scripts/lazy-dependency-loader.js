import { appendFileSync } from "node:fs"
let settings
export function initialize(data) {
  settings = data
}
export async function resolve(specifier, context, next) {
  if (settings.failure === specifier) throw new Error("Injected dependency initialization failure")
  const result = await next(specifier, context)
  if (settings.heavy.includes(specifier)) appendFileSync(settings.trace, `${specifier}\n`)
  return result
}
