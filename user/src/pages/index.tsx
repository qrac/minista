import AppLayout from "../components/app-layout"

const PageHome = () => {
  return (
    <AppLayout>
      <h1>Home</h1>
      <ul>
        <li>
          <a href="/about/">About</a>
        </li>
        <li>
          <a href="/comment/">Comment</a>
        </li>
        <li>
          <a href="/issues/">Issues</a>
        </li>
        <li>
          <a href="/markdown/">Markdown</a>
        </li>
        <li>
          <a href="/mdx2/">MDX 2</a>
        </li>
        <li>
          <a href="/icons/">Icons</a>
        </li>
        <li>
          <a href="/raw/">Raw</a>
        </li>
        <li>
          <a href="/download/">Download</a>
        </li>
        <li>
          <a href="/migrate/">Migrate</a>
        </li>
      </ul>
    </AppLayout>
  )
}

export default PageHome
