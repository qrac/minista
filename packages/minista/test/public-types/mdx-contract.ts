import type { CompileOptions } from "@mdx-js/mdx"
import type { MdxCompileOptions } from "../../src/plugins/ssg/mdx-options.js"

type Upstream = Omit<CompileOptions, "development" | "format" | "SourceMapGenerator">
type Assert<T extends true> = T
// Both keys and values must match; optional-property assignability alone misses new options.
type Keys = Assert<keyof Upstream extends keyof MdxCompileOptions ? keyof MdxCompileOptions extends keyof Upstream ? true : false : false>
type Values = Assert<Upstream extends MdxCompileOptions ? MdxCompileOptions extends Upstream ? true : false : false>
export type Contract = [Keys, Values]
