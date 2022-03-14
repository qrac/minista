import { Head } from "minista"

import AppLayout from "../../components/app-layout"

export const getStaticData = async () => {
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

type PageIssuesProps = {
  issues?: { title: string; number: number }[]
}

const PageIssues = (props: PageIssuesProps) => {
  return (
    <AppLayout>
      <Head>
        <title>Issues</title>
      </Head>
      <h1>Issues</h1>
      <ul>
        {props.issues?.map((item, index) => (
          <li key={index}>
            <a href={`/issues/${item.number}/`}>{item.title}</a>
          </li>
        ))}
      </ul>
    </AppLayout>
  )
}

export default PageIssues
