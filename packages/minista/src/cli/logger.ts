import { bold, green, blue, red, gray } from "picocolors"

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
        return bold(green(label))
      case "FETCH":
        return bold(blue(label))
      case "ERROR":
        return bold(red(label))
      default:
        return ""
    }
  })()
  const mainStr = (() => {
    switch (label) {
      case "ERROR":
        return red(main)
      default:
        return bold(main)
    }
  })()

  let texts = [labelStr, mainStr]
  sub && texts.push(gray(sub))

  let dataSize = ""
  data && (dataSize = (data.length / 1024).toFixed(2))
  dataLength && (dataSize = (dataLength / 1024).toFixed(2))

  const size = dataSize ? gray(`${dataSize} KiB`) : ""

  console.log(texts.join(" ") + space + size)
}
