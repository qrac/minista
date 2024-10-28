// Import GetStaticData or StaticData
// - Arrow Function Type: GetStaticData
// - Function Result Type: Promise<StaticData>
import type { StaticData, PageProps } from "minista"

export async function getStaticData(): Promise<StaticData[]> {
  //const apiUrl = "https://api.github.com/repos/qrac/minista/issues"
  //const apiParamsQuery = "?state=all&creator=qrac&per_page=5"
  //const response = await fetch(apiUrl + apiParamsQuery)

  const apiUrl = "http://localhost:5174/issues"
  const response = await fetch(apiUrl)

  const data = await response.json()
  const langList = ["en", "ja"]
  return langList
    .map((lang) =>
      data.map((item: PageIssuesTemplateProps) => ({
        props: item,
        paths: { lang, number: item.number },
      }))
    )
    .flat()
}

type PageIssuesTemplateProps = PageProps & {
  title: string
  body: string
  number: number
}

export default function (props: PageIssuesTemplateProps) {
  return (
    <>
      <h1>{props.title}</h1>
      <div>{props.body}</div>
    </>
  )
}
