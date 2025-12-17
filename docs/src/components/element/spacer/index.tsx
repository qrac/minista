import type { Props } from "./props"
import { initialProps } from "./props"

export default function ElementSpacer(props: Partial<Props>) {
  const { width, height } = { ...initialProps, ...props }
  const widthValue = typeof width === "number" ? `${width}px` : width
  const heightValue = typeof height === "number" ? `${height}px` : height
  return (
    <div
      className="spacer"
      style={
        {
          "--w": widthValue || null,
          "--h": heightValue || null,
        } as React.CSSProperties
      }
    />
  )
}
