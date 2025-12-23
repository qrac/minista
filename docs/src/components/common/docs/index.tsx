import type { Props } from "./props"
import { initialProps } from "./props"

export default function CommonDocs(props: Partial<Props>) {
  const { DOMElement, isSidetocTarget, children } = {
    ...initialProps,
    ...props,
  }
  return (
    <DOMElement
      className="docs"
      data-sidetoc-target={isSidetocTarget ? true : undefined}
    >
      {children}
    </DOMElement>
  )
}
