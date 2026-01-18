import type { Props } from "./props"
import { initialProps } from "./props"

export default function CommonSidetoc(props: Partial<Props>) {
  const {} = { ...initialProps, ...props }
  return (
    <nav className="sidetoc">
      <div className="box is-space-xs">
        <h2 className="text is-weight-700 is-font-sans-en is-xs">
          On this page
        </h2>
        <div data-sidetoc=""></div>
      </div>
    </nav>
  )
}
