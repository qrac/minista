import type { Metadata, LayoutProps } from "minista/client"
import { Head } from "minista/head"

import { Header } from "../components/header"
import { Menu } from "../components/menu"
import setupTheme from "../components/theme/setup.js?raw"

export const metadata: Metadata = {}

export default function (props: LayoutProps) {
  const { type, title, url, children } = props
  const pageTitle = type === "home" ? "minista" : `${title} - minista`
  const isDocs = type === "docs"
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <link rel="stylesheet" href="/src/assets/styles.css" />
      </Head>
      <Header />
      {isDocs ? (
        <div className="box is-flex is-gap-xxl">
          <aside className="box is-flex-none is-none desktop:is-block">
            <Menu url={url} />
          </aside>
          <main className="box is-flex-0">
            <div className="wysiwyg">{children}</div>
          </main>
          <aside className="box is-flex-none is-none wide:is-block"></aside>
        </div>
      ) : (
        <main>{children}</main>
      )}
      <script dangerouslySetInnerHTML={{ __html: setupTheme }} />
    </>
  )
}
