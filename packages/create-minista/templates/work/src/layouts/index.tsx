import type { Metadata, LayoutProps } from "minista/client"
import { Head } from "minista/head"

export const metadata: Metadata = {}

export default function (props: LayoutProps) {
  return (
    <>
      <Head>
        <title>{props.title}</title>
      </Head>
      <div>{props.children}</div>
    </>
  )
}
