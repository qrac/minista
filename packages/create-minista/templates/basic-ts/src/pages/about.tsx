import type { Metadata, PageProps } from "minista/types"

export const metadata: Metadata = {
  title: "About",
  draft: false, // true = Don't build the page
}

export default function (props: PageProps) {
  return (
    <>
      <h1>{props.title}</h1>
      <p>
        This is a sample page. You can edit this page at "src/pages/about.tsx".
      </p>
    </>
  )
}
