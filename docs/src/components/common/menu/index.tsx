import { FiExternalLink, FiX } from "react-icons/fi"

import ElementModal from "../../element/modal"
import ElementSpacer from "../../element/spacer"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function CommonMenu(props: Partial<Props>) {
  const { currentUrl, itemGroups } = { ...initialProps, ...props }
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
              <FiX className="icon is-lg" />
            </button>
          </div>
          <div className="box is-px-xl is-space-xl">
            {itemGroups.map((group, groupIndex) => (
              <div className="box is-space-sm" key={groupIndex}>
                <h3 className="text is-weight-700 is-font-sans-en is-uppercase">
                  {group.name}
                </h3>
                <ul>
                  {group.items.map((item, itemIndex) => (
                    <li key={itemIndex}>
                      {currentUrl === item.url && group.name !== "Main" ? (
                        <div className="box is-flex is-flex-full is-py-xs is-px-md">
                          <span className="text is-primary is-font-sans-en">
                            {item.name}
                          </span>
                        </div>
                      ) : (
                        <a
                          className="box is-flex is-middle is-gap-xxs is-py-xs is-px-md"
                          href={item.url}
                        >
                          <span className="text is-font-sans-en">
                            {item.name}
                          </span>
                          {item.externalLink && (
                            <FiExternalLink className="icon is-dark-4" />
                          )}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <ElementSpacer height={100} />
        </div>
      </nav>
    </ElementModal>
  )
}
