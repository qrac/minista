import type { Metadata, PageProps } from "minista/client"

export const metadata: Metadata = {
  draft: true,
}

export default function (props: PageProps) {
  return (
    <>
      <h1>{props.title}</h1>
    </>
  )
}
