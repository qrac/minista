import type { LayoutProps } from "minista-plugin-story/client"

export default function ({ title, url, layout, children }: LayoutProps) {
  return (
    <>
      <header>
        <ul>
          <li>title: {title}</li>
          <li>url: {url}</li>
          <li>layout: {layout}</li>
        </ul>
      </header>
      <main>{children}</main>
    </>
  )
}
