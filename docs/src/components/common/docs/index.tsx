import type { Props } from "./props"
import { initialProps } from "./props"
import "./style.css"

export default function CommonDocs(props: Partial<Props>) {
  const { DOMElement, isSidetocTarget, hasSearch, children } = {
    ...initialProps,
    ...props,
  }
  return (
    <DOMElement
      className="docs"
      data-sidetoc-target={isSidetocTarget ? true : undefined}
      data-search={hasSearch ? "" : undefined}
    >
      {children}
    </DOMElement>
  )
}
