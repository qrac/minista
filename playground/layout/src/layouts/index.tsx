import type { Metadata, LayoutProps } from "minista/types"
import { Head } from "minista/head"

import { Test } from "../components/test"

export const metadata: Metadata = {
  title: "default title",
}

function TitleTag(props: { title: string }) {
  return <title>{props.title}</title>
}

export default function (props: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <TitleTag title={props.title} />
      </head>
      <body>
        <Head>
          <meta property="og:site_name" content={props.title} />
        </Head>
        <div>
          <Test />
          {props.children}
        </div>
        <hr />
        <div>URL: {props.url}</div>
      </body>
    </html>
  )
}
