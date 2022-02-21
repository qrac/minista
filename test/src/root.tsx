import { Head } from "minista"

import "highlight.js/styles/nord.css"
import "./assets/style.css"

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

type RootProps = {
  global: GlobalProps
  children: React.ReactNode
}

const Root = ({ global, children }: RootProps) => {
  return (
    <>
      <Head>
        <title>{global?.title}</title>
        <meta property="description" content={global?.description}></meta>
      </Head>
      {children}
    </>
  )
}

export default Root
