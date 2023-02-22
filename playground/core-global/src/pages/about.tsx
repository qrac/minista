import type { Metadata, PageProps } from "minista"

export const metadata: Metadata = {
  title: "about",
}

export default function ({ title }: PageProps) {
  return (
    <>
      <div>{title} content</div>
    </>
  )
}
