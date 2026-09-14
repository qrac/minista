import type { Metadata, PageProps } from "minista/types"

export const metadata: Metadata = { locale: "ja" }

export default function (props: PageProps) {
  const { locale } = props
  return (
    <>
      <div>locale: {locale}</div>
    </>
  )
}
