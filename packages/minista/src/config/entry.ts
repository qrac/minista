import path from "node:path"

export type EntryPatterns =
  | string
  | string[]
  | { [key: string]: string }
  | EntryObject[]

type EntryObject = {
  name?: string
  input: string
  insertPages: string | string[] | { include: string[]; exclude?: string[] }
  position?: "head" | "start" | "end"
  attributes?: string | false
}

export type ResolvedViteEntry = { [key: string]: string }

export type ResolvedEntry = ResolvedEntryObject[]

type ResolvedEntryObject = {
  name: string
  input: string
  insertPages: { include: string[]; exclude?: string[] }
  position: "head" | "start" | "end"
  attributes: string | false
}

export function resolveEntryInclude(
  input: EntryObject["insertPages"]
): string[] {
  if (typeof input === "string") {
    return input.startsWith("!") ? ["**/*"] : [input]
  }
  if (Array.isArray(input) && input.length > 0) {
    return input.filter((item) => !item.startsWith("!"))
  }
  if (typeof input === "object" && input.hasOwnProperty("include")) {
    const object = input as { include: string[] }
    return object.include
  }
  return ["**/*"]
}

export function resolveEntryExclude(
  input: EntryObject["insertPages"]
): string[] {
  if (typeof input === "string") {
    return []
  }
  if (Array.isArray(input) && input.length > 0) {
    const strArray = input as string[]
    const excludeArray = strArray.filter((item) => item.startsWith("!"))
    const replacedExcludeArray = excludeArray.map((item) =>
      item.replace(/^!/, "")
    )
    return replacedExcludeArray
  }
  if (typeof input === "object" && input.hasOwnProperty("exclude")) {
    const object = input as { exclude: string[] }
    return object.exclude
  }
  return []
}

export function resolveViteEntry(
  root: string,
  entry: ResolvedEntry
): ResolvedViteEntry {
  if (!entry.length) {
    return {}
  }
  const entries = Object.fromEntries(
    entry.map((item) => [item.name, path.join(root, item.input)])
  )
  return entries
}

export async function resolveEntry(
  entry: EntryPatterns
): Promise<ResolvedEntry> {
  const entries: ResolvedEntryObject[] = []

  async function pushEntries(input: EntryPatterns) {
    if (!input) {
      return
    }

    if (typeof input === "string") {
      const pattern: ResolvedEntryObject = {
        name: path.parse(input).name,
        input,
        insertPages: { include: ["**/*"], exclude: [] },
        position: "head",
        attributes: "",
      }
      return entries.push(pattern)
    } else if (Array.isArray(input) && input.length > 0) {
      if (typeof input[0] === "string") {
        const strArray = input as string[]
        await Promise.all(
          strArray.map(async (item) => {
            const pattern: ResolvedEntryObject = {
              name: path.parse(item).name,
              input: item,
              insertPages: { include: ["**/*"], exclude: [] },
              position: "head",
              attributes: "",
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
            const pattern: ResolvedEntryObject = {
              name: name,
              input: item.input,
              insertPages: { include, exclude },
              position: item.position || "head",
              attributes: item.attributes || "",
            }
            return entries.push(pattern)
          })
        )
      }
    } else if (typeof input === "object") {
      await Promise.all(
        Object.entries(input).map(async (item) => {
          const pattern: ResolvedEntryObject = {
            name: item[0],
            input: item[1],
            insertPages: { include: ["**/*"], exclude: [] },
            position: "head",
            attributes: "",
          }
          return entries.push(pattern)
        })
      )
    }
  }
  await pushEntries(entry)

  const entryNames = entries.map((item) => item.name)
  const duplicateNames = entryNames.filter(
    (value, index, self) =>
      self.indexOf(value) === index && self.lastIndexOf(value) !== index
  )
  const uniqueNameEntries = entries.map((item, index) => {
    const name = duplicateNames.includes(item.name)
      ? `${item.name}-ministaDuplicateName${index}`
      : item.name
    return {
      name,
      input: item.input,
      insertPages: item.insertPages,
      position: item.position,
      attributes: item.attributes,
    }
  })
  return uniqueNameEntries
}
