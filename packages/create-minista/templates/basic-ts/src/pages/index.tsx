import type { Metadata, PageProps } from "minista/types"

import icon from "../assets/images/icon.svg"

export const metadata: Metadata = {}

export default function (props: PageProps) {
  return (
    <>
      <h1>Hello!</h1>
      <p>
        This is a sample page. You can edit this page at "src/pages/index.tsx".
      </p>
      <img src={icon} alt="Hero" width="60" height="60" />
    </>
  )
}
