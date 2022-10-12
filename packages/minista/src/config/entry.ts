import path from "node:path"

export type Entry =
  | string
  | string[]
  | { [key: string]: string }
  | EntryObject[]

type EntryObject = {
  name?: string
  input: string
  insertPages: string | string[] | { include: string[]; exclude?: string[] }
}

export type ResolvedEntry = ResolvedEntryObject[]

type ResolvedEntryObject = {
  name: string
  input: string
  insertPages: string[]
}

export function resolveEntryInclude(
  input: EntryObject["insertPages"]
): string[] {
  if (typeof input === "string") {
    const includeArray = input.startsWith("!") ? ["**/*"] : [input]
    return includeArray
  } else if (Array.isArray(input) && input.length > 0) {
    const includeArray = input.filter((item) => !item.startsWith("!"))
    return includeArray
  } else if (typeof input === "object" && input.hasOwnProperty("include")) {
    const object = input as { include: string[] }
    return object.include
  } else {
    return ["**/*"]
  }
}

export function resolveEntryExclude(
  input: EntryObject["insertPages"]
): string[] {
  if (typeof input === "string") {
    return []
  } else if (Array.isArray(input) && input.length > 0) {
    const strArray = input as string[]
    const excludeArray = strArray.filter((item) => item.startsWith("!"))
    const replacedExcludeArray = excludeArray.map((item) =>
      item.replace(/^!/, "")
    )
    return replacedExcludeArray
  } else if (typeof input === "object" && input.hasOwnProperty("exclude")) {
    const object = input as { exclude: string[] }
    return object.exclude
  } else {
    return []
  }
}

export async function resolveEntry(
  entry: Entry,
  resolvedRoot: string
): Promise<ResolvedEntry> {
  const entries: ResolvedEntryObject[] = []

  async function pushEntries(input: Entry) {
    if (!input) {
      return
    } else if (typeof input === "string") {
      const pattern = {
        name: path.parse(input).name,
        input: path.join(resolvedRoot, input),
        insertPages: ["**/*"],
      }
      return entries.push(pattern)
    } else if (Array.isArray(input) && input.length > 0) {
      if (typeof input[0] === "string") {
        const strArray = input as string[]
        await Promise.all(
          strArray.map(async (item) => {
            const pattern = {
              name: path.parse(item).name,
              input: path.join(resolvedRoot, item),
              insertPages: ["**/*"],
            }
            return entries.push(pattern)
          })
        )
      } else {
        const objectArray = input as EntryObject[]
        await Promise.all(
          objectArray.map(async (item) => {
            const name = item.name || path.parse(item.input).name
            const include = resolveEntryInclude(item.insertPages)
            const exclude = resolveEntryExclude(item.insertPages)
            const fixedExclude = exclude.map((item) => "!" + item)
            const pattern = {
              name: name,
              input: path.join(resolvedRoot, item.input),
              insertPages: [...include, ...fixedExclude],
            }
            return entries.push(pattern)
          })
        )
      }
    } else if (typeof input === "object") {
      await Promise.all(
        Object.entries(input).map(async (item) => {
          const pattern = {
            name: item[0],
            input: path.join(resolvedRoot, item[1]),
            insertPages: ["**/*"],
          }
          return entries.push(pattern)
        })
      )
    }
  }
  await pushEntries(entry)

  return entries
}
