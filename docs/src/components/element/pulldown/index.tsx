import { clsx } from "clsx"
import { cloneElement } from "react"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function ElementPulldown(props: Partial<Props>) {
  const { id, buttonNode, radius, children } = {
    ...initialProps,
    ...props,
  }
  const mergedStyle = {
    ...(buttonNode.props.style ?? {}),
    ...{ anchorName: `--${id}` },
  }
  const pulldownButton = cloneElement(buttonNode, {
    popoverTarget: id,
    style: mergedStyle,
  })
  return (
    <>
      {pulldownButton}
      <div
        popover=""
        id={id}
        style={{ positionAnchor: "--" + id }}
        className={clsx("pulldown", radius && `is-radius-${radius}`)}
      >
        {children}
      </div>
    </>
  )
}
