import type { Metadata, PageProps } from "minista/client"

export const metadata: Metadata = {
  title: "Index",
}

export default function (props: PageProps) {
  return (
    <>
      <h1>{props.title}</h1>
      <ul>
        <li>
          <a href="/nest/">Nest</a>
        </li>
      </ul>
    </>
  )
}
