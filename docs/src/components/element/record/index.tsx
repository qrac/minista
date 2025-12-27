import type { Props } from "./props"
import { initialProps } from "./props"

export default function ElementRecord(props: Partial<Props>) {
  const { text } = { ...initialProps, ...props }
  return (
    <span className="text is-record is-font-sans-en is-tx-3 is-xs">{text}</span>
  )
}
