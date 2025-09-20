import type { Metadata, PageProps } from "minista/client"

export const metadata: Metadata = {
  type: "home",
}

export default function (props: PageProps) {
  return (
    <>
      <h1>{props.title}</h1>
      <a href="/docs/">Go to Documentation</a>
    </>
  )
}
