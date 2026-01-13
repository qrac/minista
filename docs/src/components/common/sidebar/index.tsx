import ElementSearch from "../../element/search"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function CommonSidebar(props: Partial<Props>) {
  const { currentUrl, itemGroups } = { ...initialProps, ...props }
  return (
    <nav className="sidebar">
      <div className="box is-pr-md is-space-xl">
        <ElementSearch />
        {itemGroups.map((group, groupIndex) => (
          <div className="box is-space-sm" key={groupIndex}>
            <h3 className="text is-strong is-font-sans-en is-uppercase">
              {group.name}
            </h3>
            <ul>
              {group.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  {currentUrl === item.url ? (
                    <div className="box is-flex is-flex-full is-py-xs is-px-md">
                      <span className="text is-primary is-font-sans-en">
                        {item.name}
                      </span>
                    </div>
                  ) : (
                    <a
                      className="box is-flex is-flex-full is-link is-py-xs is-px-md is-radius-ml"
                      href={item.url}
                    >
                      <span className="text is-font-sans-en">{item.name}</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}
