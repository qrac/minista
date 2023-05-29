export default function ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <article className="docs-main">
      {title && <h1>{title}</h1>}
      <div className="docs-main-contents" data-search>
        {children}
      </div>
    </article>
  )
}
