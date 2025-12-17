const groups = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs/" },
      { title: "Migration", href: "/docs/migration" },
    ],
  },
  {
    title: "Plugins",
    items: [
      { title: "pluginSsg", href: "/docs/plugins/ssg" },
      { title: "pluginMdx", href: "/docs/plugins/mdx" },
      { title: "pluginBundle", href: "/docs/plugins/bundle" },
      { title: "pluginEntry", href: "/docs/plugins/entry" },
      { title: "pluginImage", href: "/docs/plugins/image" },
      { title: "pluginSvg", href: "/docs/plugins/svg" },
      { title: "pluginSprite", href: "/docs/plugins/sprite" },
      { title: "pluginComment", href: "/docs/plugins/comment" },
      { title: "pluginIsland", href: "/docs/plugins/island" },
      { title: "pluginSearch", href: "/docs/plugins/search" },
      { title: "pluginBeautify", href: "/docs/plugins/beautify" },
      { title: "pluginArchive", href: "/docs/plugins/archive" },
    ],
  },
]

export function Menu({ url }: { url: string }) {
  return (
    <nav>
      {groups.map((group) => (
        <div key={group.title}>
          <h2>{group.title}</h2>
          <ul>
            {group.items.map((item) => (
              <li
                className={url === item.href ? "is-current" : undefined}
                key={item.title}
              >
                <a href={item.href}>{item.title}</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
