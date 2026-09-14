import { LuExternalLink, LuX } from "react-icons/lu"

import ElementModal from "../../element/modal"
import ElementSearch from "../../element/search"
import ElementSpacer from "../../element/spacer"
import { localizeName, localizePath } from "../../utils/i18n"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function CommonMenu(props: Partial<Props>) {
  const { url, locale, locales, navMain, navDocsGroups } = {
    ...initialProps,
    ...props,
  }
  return (
    <ElementModal modalId="menu" position="right" slide="left">
      <nav className="menu">
        <div className="card is-max-width-100per is-width-240px is-height-100vh is-bg-1 is-overflow-scroll-y">
          <div className="box is-flex is-right is-bg-light is-sticky-top">
            <div tabIndex={-1} autoFocus />
            <button
              type="button"
              className="box is-flex is-p-lg"
              data-modal-close="menu"
            >
              <LuX className="icon is-lg" />
            </button>
          </div>
          <div className="box is-px-xl is-space-xl">
            <ElementSearch locale={locale} />
            <Group
              url={url}
              locale={locale}
              locales={locales}
              group={navMain}
              isMain={true}
            />
            {navDocsGroups.map((group, groupIndex) => (
              <Group
                url={url}
                locale={locale}
                locales={locales}
                group={group}
                key={groupIndex}
              />
            ))}
          </div>
          <ElementSpacer height={100} />
        </div>
      </nav>
    </ElementModal>
  )
}

function Group({
  url,
  locale,
  locales,
  group,
  isMain = false,
}: {
  url: Props["url"]
  locale: Props["locale"]
  locales: Props["locales"]
  group: Props["navMain"] | Props["navDocsGroups"][number]
  isMain?: boolean
}) {
  return (
    <div className="box is-space-sm">
      <h3 className="text is-weight-700 is-uppercase">
        {localizeName(group.name, locale)}
      </h3>
      <ul>
        {group.items.map((item, itemIndex) => {
          const itemUrl = localizePath(item.url, locale, locales)
          const itemName = localizeName(item.name, locale)
          const isExternal = "external" in item && item.external
          return (
            <li key={itemIndex}>
              {url === itemUrl && !isMain ? (
                <div className="box is-flex is-flex-full is-py-xs is-px-md">
                  <span className="text is-primary">{itemName}</span>
                </div>
              ) : (
                <a
                  className="box is-flex is-middle is-gap-xxs is-py-xs is-px-md"
                  href={itemUrl}
                >
                  <span className="text">{itemName}</span>
                  {isExternal && <LuExternalLink className="icon is-dark-4" />}
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
