import ElementSearch from "../../element/search"
import { localizeName, localizePath } from "../../utils/i18n"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function CommonSidebar(props: Partial<Props>) {
  const { url, locale, locales, navDocsGroups } = { ...initialProps, ...props }
  return (
    <nav className="sidebar">
      <div className="box is-pr-md is-space-xl">
        <ElementSearch locale={locale} />
        {navDocsGroups.map((group, groupIndex) => (
          <div className="box is-space-sm" key={groupIndex}>
            <h3 className="text is-weight-700 is-uppercase">
              {localizeName(group.name, locale)}
            </h3>
            <ul>
              {group.items.map((item, itemIndex) => {
                const itemUrl = localizePath(item.url, locale, locales)
                const itemName = localizeName(item.name, locale)
                return (
                  <li key={itemIndex}>
                    {url === itemUrl ? (
                      <div className="box is-flex is-flex-full is-py-xs is-px-md">
                        <span className="text is-primary">{itemName}</span>
                      </div>
                    ) : (
                      <a
                        className="box is-flex is-flex-full is-link is-py-xs is-px-md is-radius-ml"
                        href={itemUrl}
                      >
                        <span className="text">{itemName}</span>
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}
