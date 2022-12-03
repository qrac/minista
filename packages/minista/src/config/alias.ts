import type { AliasOptions as ViteAliasOptions } from "vite"

export type AliasPatterns = AliasObject | AliasArray

type AliasObject = { [key: string]: string }
type AliasArray = { find: string; replacement: string }[]

export type ResolvedAlias = AliasArray

export async function resolveAlias(
  configAlias: AliasPatterns,
  viteConfigAlias: ViteAliasOptions
): Promise<ResolvedAlias> {
  const alias: AliasArray = []

  async function pushAlias(input: AliasPatterns | ViteAliasOptions) {
    if (!input) {
      return
    } else if (Array.isArray(input) && input.length > 0) {
      await Promise.all(
        input.map(async (item) => {
          const pattern = {
            find: item.find,
            replacement: item.replacement,
          }
          return alias.push(pattern)
        })
      )
    } else if (typeof input === "object") {
      await Promise.all(
        Object.entries(input).map((item) => {
          const pattern = {
            find: item[0],
            replacement: item[1],
          }
          return alias.push(pattern)
        })
      )
    }
  }
  await pushAlias(configAlias)
  await pushAlias(viteConfigAlias)

  return alias
}
