import type { Frontmatter, PageProps } from "minista"

export const frontmatter: Frontmatter = {
  title: "home",
}

export default function ({ title }: PageProps) {
  return (
    <>
      <div>{title} content</div>
    </>
  )
}
