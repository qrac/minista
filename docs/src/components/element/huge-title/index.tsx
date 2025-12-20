import { clsx } from "clsx"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function ElementHugeTitle(props: Partial<Props>) {
  const { DOMElement, text, color, align, fixPosition, fixTop } = {
    ...initialProps,
    ...props,
  }
  return (
    <DOMElement
      className={clsx(
        "huge-title",
        color && `is-${color}`,
        align !== "left" && `is-${align}`,
        fixPosition && "is-fix-position",
        fixTop && "is-fix-top"
      )}
    >
      {text}
    </DOMElement>
  )
}
