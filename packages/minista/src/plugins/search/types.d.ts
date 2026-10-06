type PluginOptionBase = {
  outName: string
  src: string[]
  ignore: string[]
  trimTitle: string
  targetSelector: string
  ignoreSelectors: string[]
  relativeAttr: string
  inputAttr: string
}
type HitOptions = {
  minLength: number
  number: boolean
  english: boolean
  hiragana: boolean
  katakana: boolean
  kanji: boolean
}

export type PluginOptions = PluginOptionBase & {
  hit: HitOptions
}
export type SearchIndexOptions = Partial<PluginOptionBase> & {
  hit?: Partial<HitOptions>
}
export type UserPluginOptions = (SearchIndexOptions & { indexes?: undefined }) | (
  Omit<SearchIndexOptions, "outName" | "src" | "ignore"> & {
    /** Named indexes. Each index inherits common options; arrays replace them. */
    indexes: Record<string, SearchIndexOptions>
    outName?: never
    src?: never
    ignore?: never
  }
)

export type SearchData = {
  /** Present only for named indexes. */
  index?: string
  words: string[]
  hits: number[]
  pages: SearchPage[]
}

export type SearchPage = {
  url: string
  title: number[]
  toc: [number, string][]
  content: number[]
}

export type SearchResult = {
  url: string
  content: string
}

export type SearchProps = {
  /** Required when pluginSearch defines indexes; omit in single-index mode. */
  index?: string
  className?: string
  minHitLength?: number
  maxHitPages?: number
  maxHitWords?: number
  attributes?: React.HTMLAttributes<HTMLElement>
  field?: {
    className?: string
    placeholder?: string
    beforeElement?: React.ReactElement
    afterElement?: React.ReactElement
    clearElement?: React.ReactElement<React.HTMLAttributes<HTMLElement>>
    attributes?: React.HTMLAttributes<HTMLElement>
  } & React.HTMLAttributes<HTMLElement>
  list?: {
    className?: string
    showUrl?: boolean
    attributes?: React.HTMLAttributes<HTMLElement>
  } & React.HTMLAttributes<HTMLElement>
} & React.HTMLAttributes<HTMLElement>
