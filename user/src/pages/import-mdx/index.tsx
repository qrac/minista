import { Head } from "minista"

import MdVanilla from "../../assets/markdown/vanilla.md"
import MdTop from "../../assets/markdown/top.mdx"

const PageImportMdx = () => {
  return (
    <>
      <Head>
        <title>import MDX</title>
      </Head>
      <h1>import MDX</h1>
      <MdVanilla />
      <MdTop />
    </>
  )
}

export default PageImportMdx
