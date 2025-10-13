import type { Metadata, PageProps } from "minista/client"

import { Test2 } from "../components/test2"

export const metadata: Metadata = {
  title: "Index",
  foo: "bar",
}

export default function (props: PageProps) {
  return (
    <>
      <Test2 />
      <h1>{props.title}</h1>
      <ul>
        <li>
          <a href="/nest/">Nest</a>
        </li>
        <li>
          <a href="/nest/draft">Draft</a>
        </li>
      </ul>
    </>
  )
}
