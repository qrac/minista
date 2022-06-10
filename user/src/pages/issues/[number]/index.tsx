import { Head } from "minista"

export const getStaticData = async () => {
  const apiUrl = "https://api.github.com/repos/qrac/minista/issues"
  const apiParamsQuery = "?state=all&creator=qrac&per_page=5"
  const response = await fetch(apiUrl + apiParamsQuery)
  const data = await response.json()
  return data.map((item: PageIssuesTemplateProps) => ({
    props: item,
    paths: { number: item.number },
  }))
}

type PageIssuesTemplateProps = {
  title: string
  body: string
  number: number
}

const PageIssuesTemplate = (props: PageIssuesTemplateProps) => {
  return (
    <>
      <Head>
        <title>{props.title}</title>
      </Head>
      <h1>{props.title}</h1>
      <div>{props.body}</div>
      {/*<Markdown content={props.body} />*/}
    </>
  )
}

export default PageIssuesTemplate
