import type { Metadata, PageProps } from "minista"

export const metadata: Metadata = {
  title: "home",
}

export default function ({ title }: PageProps) {
  return (
    <>
      <div>{title} content</div>
    </>
  )
}
