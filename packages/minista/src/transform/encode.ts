import iconv from "iconv-lite"

export function transformEncode(content: string, encoding: string) {
  let contentBuffer: Buffer
  let contentString: string
  let contentArray: string[]

  contentBuffer = Buffer.from(content)
  contentString = iconv.decode(contentBuffer, "utf-8")
  contentBuffer = iconv.encode(contentString, encoding)

  if (encoding.match(/^shift[\s-_]*jis$/i)) {
    contentArray = contentString.split("")
    contentString = contentString
      .split("")
      .map((char, index) => {
        const arrayChar = contentArray[index]
        if (arrayChar === "?") {
          return char
        } else if (char === "?") {
          return `&#x${arrayChar.codePointAt(0)?.toString(16)};`
        }
        return char
      })
      .join("")
    contentBuffer = iconv.encode(contentString, encoding)
    return contentBuffer
  }
  return contentBuffer
}
