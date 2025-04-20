import type { StaticData, PageProps } from "minista/client"

export async function getStaticData(): Promise<StaticData> {
  const apiUrl = "https://api.github.com/repos/qrac/minista/issues"
  const apiParamsQuery = "?state=all&creator=qrac&per_page=5"
  const response = await fetch(apiUrl + apiParamsQuery)
  const data = await response.json()
  return {
    props: {
      issues: data,
    },
  }
}

type PagePropsWithIssues = PageProps & {
  issues?: { title: string; number: number }[]
}

export default function (props: PagePropsWithIssues) {
  const langList = ["en", "ja"]
  return (
    <>
      <h1>Issues</h1>
      {langList.map((lang) => (
        <div key={lang}>
          <h2>lang: {lang}</h2>
          <ul>
            {props.issues?.map((item, index) => (
              <li key={index}>
                <a href={`/issues/${lang}/${item.number}`}>{item.title}</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}
