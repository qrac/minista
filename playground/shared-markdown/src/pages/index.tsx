import { Markdown, Image } from "minista"

const mdContent = `# Heading 1
## Heading 2`
const textVar = "variable"

const components = {
  img: (props: React.HTMLProps<HTMLElement>) => (
    <Image src={props.src} alt={props.alt} />
  ),
}

export default function () {
  return (
    <>
      <Markdown content={mdContent} />
      <Markdown>
        {`### Heading 3
        text ${textVar}`}
      </Markdown>
      <Markdown components={components}>
        {`## Change Image Component

### Local

![Local](/src/assets/image.png)

### Remote

![Remote](https://picsum.photos/id/1/800/600)`}
      </Markdown>
    </>
  )
}
