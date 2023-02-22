import type { Frontmatter, PageProps } from "minista"

export const frontmatter: Frontmatter = {
  title: "about",
}

export default function ({ title }: PageProps) {
  return (
    <>
      <div>{title} content</div>
    </>
  )
}
