import type { Metadata, PageProps } from "minista/types"

export const metadata: Metadata = {
  title: "Nest",
  draft: false,
}

export default function (props: PageProps) {
  return (
    <>
      <h1>{props.title}</h1>
    </>
  )
}
