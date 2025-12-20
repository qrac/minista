import ElementSpacer from "../../../element/spacer"
import ElementHugeTitle from "../../../element/huge-title"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function PageHomeWhy(props: Partial<Props>) {
  const {} = { ...initialProps, ...props }
  return (
    <section className="section is-bg-2">
      <div className="inner is-px-lg">
        <ElementHugeTitle text="Why?" fixPosition={true} fixTop={true} />
        <h3 className="text">
          ministaの中身は「Viteを動かすCLI」＋「機能毎のViteプラグイン」
        </h3>
      </div>
      <ElementSpacer height={50} />
    </section>
  )
}
