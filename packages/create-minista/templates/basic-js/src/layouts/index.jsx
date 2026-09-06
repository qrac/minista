import Header from "../components/header"
import Footer from "../components/footer"
import "./style.css"

import pjt from "../../project.json"

/** @param {import("minista/types").LayoutProps} props */
export default function (props) {
  const { siteName, navItems } = pjt
  const title = props.title ? `${props.title} - ${siteName}` : siteName
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <title>{title}</title>
        <script src="/src/assets/entries/scripts.js" type="module" />
        <link rel="icon" href="/favicon.png" />
      </head>
      <body>
        <Header
          siteName={siteName}
          currentUrl={props.url}
          navItems={navItems}
        />
        <main>{props.children}</main>
        <Footer siteName={siteName} />
      </body>
    </html>
  )
}
