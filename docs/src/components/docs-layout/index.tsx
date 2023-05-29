import DocsMenu from "../docs-menu"
import DocsMain from "../docs-main"

export default function ({
  pathname,
  title,
  children,
}: {
  pathname: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="docs-layout">
      <div className="docs-layout-inner">
        <DocsMenu pathname={pathname} />
        <DocsMain title={title}>{children}</DocsMain>
      </div>
    </div>
  )
}
