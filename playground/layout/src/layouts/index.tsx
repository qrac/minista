import type { Metadata, LayoutProps } from "minista/types"
import { Head } from "minista/head"

import { Test } from "../components/test"

export const metadata: Metadata = {
  title: "default title",
}

export default function (props: LayoutProps) {
  return (
    <>
      <Head>
        <title>{props.title}</title>
      </Head>
      <div>
        <Test />
        {props.children}
      </div>
      <hr />
      <div>URL: {props.url}</div>
    </>
  )
}
