import type { PluggableList } from "unified"
import type { Options as RemarkRehypeOptions } from "remark-rehype"

/** Compile-only MDX options. Kept in sync with MDX by the upstream type contract test. */
export type MdxCompileOptions = {
  baseUrl?: URL | string | null
  elementAttributeNameCase?: "html" | "react" | null
  jsx?: boolean | null
  jsxImportSource?: string | null
  jsxRuntime?: "automatic" | "classic" | null
  mdExtensions?: ReadonlyArray<string> | null
  mdxExtensions?: ReadonlyArray<string> | null
  outputFormat?: "function-body" | "program" | null
  pragma?: string | null
  pragmaFrag?: string | null
  pragmaImportSource?: string | null
  providerImportSource?: string | null
  recmaPlugins?: PluggableList | null
  remarkPlugins?: PluggableList | null
  rehypePlugins?: PluggableList | null
  remarkRehypeOptions?: Readonly<RemarkRehypeOptions> | null
  stylePropertyNameCase?: "css" | "dom" | null
  tableCellAlignToStyle?: boolean | null
}
