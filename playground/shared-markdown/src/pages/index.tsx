import { Markdown } from "minista"

const mdContent = `# Heading 1
## Heading 2`
const textVar = "variable"

export default function () {
  return (
    <>
      <Markdown content={mdContent} />
      <Markdown>
        {`### Heading 3
        text ${textVar}`}
      </Markdown>
    </>
  )
}
