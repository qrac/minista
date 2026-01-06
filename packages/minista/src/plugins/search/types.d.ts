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
export type UserPluginOptions = Partial<PluginOptionBase> & {
  hit?: Partial<HitOptions>
}

export type SearchData = {
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
