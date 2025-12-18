import ElementSpacer from "../../../element/spacer"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function PageHomeTagline(props: Partial<Props>) {
  const { heading, texts, note } = { ...initialProps, ...props }
  return (
    <section className="section is-bg-2 wide:is-lg">
      <ElementSpacer height={50} />
      <div className="inner is-px-lg">
        <div className="box is-space-md">
          <h2 className="text is-primary is-strong is-auto-phrase is-xl tablet:is-xxl">
            {heading}
          </h2>
          <div className="box is-space-xs">
            {texts.map((text, index) => (
              <p key={index} className="text is-auto-phrase">
                {text}
              </p>
            ))}
          </div>
          <p className="text is-tx-3 is-xs">{note}</p>
        </div>
      </div>
      <ElementSpacer height={50} />
    </section>
  )
}
