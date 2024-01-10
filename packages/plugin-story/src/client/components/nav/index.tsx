import { clsx } from "clsx"
import { TbNotes } from "react-icons/tb"

import type { NavItem } from "../../option.js"

export function StoryAppNav({
  storyUrl,
  navItems,
  onLinkClick,
}: {
  storyUrl: string
  navItems: NavItem[]
  onLinkClick: (link: string) => void
}) {
  const categorizedNavItems = navItems.reduce(
    (acc: { [category: string]: NavItem[] }, navItem) => {
      if (!acc[navItem.category]) {
        acc[navItem.category] = []
      }
      acc[navItem.category].push(navItem)
      return acc
    },
    {}
  )
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    onLinkClick(event.currentTarget.dataset.ministaStoryappUrl || "")
  }
  function customIconColorClass(type: string) {
    return "is-color-story"
    /*switch (type) {
      case "doc":
        return "is-color-doc"
      case "story":
        return "is-color-story"
      default:
        return "is-color-story"
    }*/
  }
  return (
    <nav className="storyapp-nav">
      {Object.keys(categorizedNavItems).map((category) => (
        <div className="storyapp-nav-category" key={category}>
          <p className="storyapp-nav-category-title">{category}</p>
          <ul className="storyapp-nav-list">
            {categorizedNavItems[category].map(
              (navItem: NavItem, index: number) => {
                const isCurrent = navItem.url === storyUrl
                return (
                  <li className="storyapp-nav-item" key={index}>
                    <a
                      className={clsx(
                        "storyapp-nav-item-link",
                        isCurrent && "is-current"
                      )}
                      href=""
                      data-minista-storyapp-url={navItem.url}
                      onClick={handleClick}
                    >
                      <TbNotes
                        className={clsx(
                          "storyapp-nav-item-icon",
                          !isCurrent && customIconColorClass(navItem.type)
                        )}
                      />
                      {navItem.label}
                    </a>
                  </li>
                )
              }
            )}
          </ul>
        </div>
      ))}
    </nav>
  )
}
