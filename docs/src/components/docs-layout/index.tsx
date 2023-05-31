import DocsMenu from "../docs-menu"
import DocsMain from "../docs-main"

export default function ({
  url,
  title,
  children,
}: {
  url: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="docs-layout">
      <div className="docs-layout-inner">
        <DocsMenu url={url} />
        <DocsMain title={title}>{children}</DocsMain>
      </div>
    </div>
  )
}
