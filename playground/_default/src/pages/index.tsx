import { Head } from "minista-plugin-ssg/client"

export default function () {
  return (
    <>
      <Head title="Index" htmlAttributes={{ lang: "en" }}>
        <meta name="description" content="Index" key="description" />
        <link rel="icon" href="/favicon.ico" />
        <script
          dangerouslySetInnerHTML={{ __html: "console.log('hello world')" }}
        />
      </Head>
      <Head>
        <meta name="description" content="Index desc" key="description" />
      </Head>
      <h1>Index</h1>
      <ul>
        <li>
          <a href="/about">About</a>
        </li>
        <li>
          <a href="/nest/">Nest</a>
        </li>
        <li>
          <a href="/nest/about">Nest About</a>
        </li>
      </ul>
    </>
  )
}
