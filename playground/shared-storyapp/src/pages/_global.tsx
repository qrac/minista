import type { GlobalProps } from "minista"

export default function ({
  title,
  url,
  location,
  layout,
  children,
}: GlobalProps) {
  return (
    <>
      <header>
        <ul>
          <li>title: {title}</li>
          <li>url: {url}</li>
          <li>location.pathname: {location.pathname}</li>
          <li>layout: {layout}</li>
        </ul>
      </header>
      <main>{children}</main>
    </>
  )
}
