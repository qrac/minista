import path from "node:path"
import { extension } from "mime-types"

function getRemoteExt(url: string) {
  const pathname = new URL(url).pathname || ""
  const parsedName = path.parse(pathname)
  return parsedName.ext.replace(/^\./, "") || ""
}

export async function getRemote(
  url: string,
  remoteName: string,
  remoteIndex: number
) {
  let fileName = ""
  let extName = ""
  let contentType = ""

  try {
    const res = await fetch(url)

    if (!res.ok || !res.body) {
      console.error(res.statusText)
      return
    }
    contentType = res.headers.get("Content-Type") || ""
    extName = extension(contentType) || getRemoteExt(url)
    extName = extName === "jpeg" ? "jpg" : extName
    fileName = `${remoteName}-${remoteIndex}.${extName}`

    const arrayBuffer = await res.arrayBuffer()
    const data = Buffer.from(arrayBuffer)
    return { fileName, data }
  } catch (err) {
    console.log(err)
    return
  }
}
