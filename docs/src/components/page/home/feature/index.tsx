import { clsx } from "clsx"

import ElementSpacer from "../../../element/spacer"
import ElementHugeTitle from "../../../element/huge-title"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function PageHomeFeature(props: Partial<Props>) {
  const { items } = { ...initialProps, ...props }
  return (
    <section className="section">
      <div className="inner is-px-lg">
        <ElementHugeTitle text="Feature" align="right" fixPosition={true} />
        <div className="grid is-gap-sm">
          {items.map((item, index) => (
            <div
              key={index}
              className={clsx(
                "column is-flex-12",
                `tablet:is-flex-${item.tabletColumn}`
              )}
            >
              <div className="card is-bg-2 is-radius-xl is-p-xl is-space-xs">
                <h3 className="text is-font-sans-en is-weight-700 is-mlg">
                  {item.title}
                </h3>
                <p className="text is-dark-2 is-autospace is-auto-phrase is-sm">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ElementSpacer height={50} />
    </section>
  )
}
