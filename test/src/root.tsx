import { Head } from "minista"

import "highlight.js/styles/nord.css"
import "@fontsource/montserrat/800.css"
import "./root.css"

export const getStaticData = async () => {
  const apiUrl = "https://api.github.com/repos/qrac/minista"
  const response = await fetch(apiUrl)
  const data = await response.json()
  return {
    props: {
      global: {
        title: data.name,
        description: data.description,
      },
    },
  }
}

export type GlobalProps = {
  title: string
  description: string
}

export type FrontmatterProps = {
  title?: string
  layout?: string
  draft?: boolean
}

type RootProps = {
  global: GlobalProps
  frontmatter?: FrontmatterProps
  children: React.ReactNode
}

const Root = ({ global, frontmatter, children }: RootProps) => {
  return (
    <>
      <Head>
        <title>
          {frontmatter?.title
            ? frontmatter?.title + " | " + global?.title
            : global?.title}
        </title>
        <meta property="description" content={global?.description}></meta>
      </Head>
      {children}
    </>
  )
}

export default Root
