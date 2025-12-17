import type { LayoutProps } from "minista/types"
import { Head } from "minista/head"

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
