import { Link } from "minista"

import AppLayout from "../components/app-layout"

const PageHome = () => {
  return (
    <AppLayout>
      <h1>Home</h1>
      <ul>
        <li>
          <Link to="/about/">About</Link>
        </li>
        <li>
          <Link to="/issues/">Issues</Link>
        </li>
        <li>
          <Link to="/mdx2/">MDX 2</Link>
        </li>
        <li>
          <Link to="/migrate/">Migrate</Link>
        </li>
      </ul>
    </AppLayout>
  )
}

export default PageHome
