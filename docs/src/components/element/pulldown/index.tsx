import { cloneElement } from "react"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function ElementPulldown(props: Partial<Props>) {
  const { id, buttonNode, children } = {
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
        className="pulldown"
      >
        {children}
      </div>
    </>
  )
}
