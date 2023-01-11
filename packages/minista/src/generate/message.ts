import pc from "picocolors"

export function generateMessage({
  fileName,
  space = "",
  data,
}: {
  fileName: string
  space?: string
  data?: string
}) {
  const title = pc.bold(pc.green("BUILD"))
  const main = pc.bold(fileName)
  const dataSize = data ? (data.length / 1024).toFixed(2) : ""
  const size = dataSize ? pc.gray(`${dataSize} KiB`) : ""

  console.log(`${title} ${main}` + space + size)
}
