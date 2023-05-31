import pc from "picocolors"

export function logger({
  label,
  main,
  sub,
  space = "",
  data,
  dataLength,
}: {
  label?: "BUILD" | "FETCH" | "ERROR"
  main: string
  sub?: string
  space?: string
  data?: string | Buffer
  dataLength?: number
}) {
  const labelStr = (() => {
    switch (label) {
      case "BUILD":
        return pc.bold(pc.green(label))
      case "FETCH":
        return pc.bold(pc.blue(label))
      case "ERROR":
        return pc.bold(pc.red(label))
      default:
        return ""
    }
  })()
  const mainStr = (() => {
    switch (label) {
      case "ERROR":
        return pc.red(main)
      default:
        return pc.bold(main)
    }
  })()

  let texts = [labelStr, mainStr]
  sub && texts.push(pc.gray(sub))

  let dataSize = ""
  data && (dataSize = (data.length / 1024).toFixed(2))
  dataLength && (dataSize = (dataLength / 1024).toFixed(2))

  const size = dataSize ? pc.gray(`${dataSize} KiB`) : ""

  console.log(texts.join(" ") + space + size)
}
