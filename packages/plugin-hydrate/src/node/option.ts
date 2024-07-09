export type UserPluginOptions = {
  outName?: string
  rootAttrSuffix?: string
  rootValuePrefix?: string
  rootDOMElement?: "div" | "span"
  rootStyle?: React.CSSProperties
  useIntersectionObserver?: boolean
  intersectionObserverOptions?: {
    root?: Element | null
    rootMargin?: string
    thresholds?: ReadonlyArray<number>
  }
}

export type PluginOptions = {
  outName: string
  rootAttrSuffix: string
  rootValuePrefix: string
  rootDOMElement: "div" | "span"
  rootStyle: React.CSSProperties
  useIntersectionObserver: boolean
  intersectionObserverOptions: {
    root: Element | null
    rootMargin: string
    thresholds: ReadonlyArray<number>
  }
}

export const defaultOptions: PluginOptions = {
  outName: "hydrate",
  rootAttrSuffix: "partial-hydration",
  rootValuePrefix: "ph",
  rootDOMElement: "div",
  rootStyle: { display: "contents" },
  useIntersectionObserver: true,
  intersectionObserverOptions: {
    root: null,
    rootMargin: "0px",
    thresholds: [0],
  },
}
