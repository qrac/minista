import type { TarOptions, ZipOptions } from "archiver"

type ArchiveBaseOptions = {
  srcDir: string
  outName: string
  ignore?: string | string[]
}

export type ArchiveOptions =
  | (ArchiveBaseOptions & {
      format?: "zip"
      options?: ZipOptions
    })
  | (ArchiveBaseOptions & {
      format: "tar"
      options?: TarOptions
    })

export type PluginOptions = {
  archives: ArchiveOptions[]
}
export type UserPluginOptions = Partial<PluginOptions>
