import ElementSpacer from "../../../element/spacer"
import ElementHugeTitle from "../../../element/huge-title"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function PageHomeFeature(props: Partial<Props>) {
  const {} = { ...initialProps, ...props }
  return (
    <section className="section wide:is-lg">
      <div className="inner is-px-lg">
        <ElementHugeTitle text="Feature" align="right" isFixPosition={true} />
        <Main />
      </div>
      <ElementSpacer height={50} />
    </section>
  )
}

function Main() {
  return (
    <div className="card is-bg-2 is-radius-xl is-p-xl">
      <h3 className="text">
        ministaの中身は「Viteを動かすCLI」＋「機能毎のViteプラグイン」
      </h3>
    </div>
  )
}
