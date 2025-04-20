import type { Metadata, LayoutProps } from "minista/client"
import { Head } from "minista/client"

export const metadata: Metadata = {
  title: "default title",
}

export default function (props: LayoutProps) {
  return (
    <>
      <Head>
        <title>{props.title}</title>
      </Head>
      <div>{props.children}</div>
      <hr />
      <div>URL: {props.url}</div>
      {props.foo && (
        <>
          <hr />
          <div>foo: {props.foo}</div>
        </>
      )}
    </>
  )
}
