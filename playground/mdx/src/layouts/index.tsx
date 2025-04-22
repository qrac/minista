import type { LayoutProps } from "minista/client"
import { Head } from "minista/client"

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
