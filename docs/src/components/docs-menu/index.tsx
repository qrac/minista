import { docs as menuItems } from "../../assets/data/menu.json"
import BlockSearch from "../block-search?ph"

export default function ({ url }: { url: string }) {
  return (
    <aside className="docs-menu">
      <details className="docs-menu-mobile">
        <summary className="docs-menu-mobile-summary">MENU</summary>
        <div className="docs-menu-mobile-contents">
          <BlockSearch />
          {menuItems.map((item, index) => (
            <div className="docs-menu-group" key={index}>
              <p className="docs-menu-group-heading">{item.heading}</p>
              <ul className="docs-menu-list">
                {item?.items.map((childItem, childIndex) => (
                  <li
                    className={
                      url === childItem.url
                        ? "docs-menu-item is-current"
                        : "docs-menu-item"
                    }
                    key={childIndex}
                  >
                    <a href={childItem.url}>{childItem.title}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
      <div className="docs-menu-desktop">
        <BlockSearch />
        {menuItems.map((item, index) => (
          <div className="docs-menu-group" key={index}>
            <p className="docs-menu-group-heading">{item.heading}</p>
            <ul className="docs-menu-list">
              {item?.items.map((childItem, childIndex) => (
                <li
                  className={
                    url === childItem.url
                      ? "docs-menu-item is-current"
                      : "docs-menu-item"
                  }
                  key={childIndex}
                >
                  <a href={childItem.url}>{childItem.title}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  )
}
