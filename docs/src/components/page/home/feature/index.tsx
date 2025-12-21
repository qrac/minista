import { clsx } from "clsx"

import ElementSpacer from "../../../element/spacer"
import ElementSectionTitle from "../../../element/section-title"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function PageHomeFeature(props: Partial<Props>) {
  const { items } = { ...initialProps, ...props }
  return (
    <section className="section">
      <div className="inner is-px-lg">
        <ElementSectionTitle text="Feature" align="right" fixPosition={true} />
        <div className="grid is-gap-sm">
          {items.map((item, index) => (
            <div
              key={index}
              className={clsx(
                "column is-flex-12",
                `tablet:is-flex-${item.tabletColumn}`
              )}
            >
              <a href={item.href} className="card is-link is-bg-2 is-radius-xl">
                <div className="box is-p-xl is-space-xs is-angle-right is-angle-fix">
                  <h3 className="text is-font-sans-en is-weight-700 is-mlg">
                    {item.title}
                  </h3>
                  <p className="text is-dark-2 is-autospace is-auto-phrase is-sm">
                    {item.description}
                  </p>
                </div>
              </a>
            </div>
          ))}
        </div>
      </div>
      <ElementSpacer height={20} />
    </section>
  )
}
