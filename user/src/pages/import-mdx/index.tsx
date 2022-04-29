import { Head } from "minista"

import AppLayout from "../../components/app-layout"

import MdVanilla from "../../assets/markdown/vanilla.md"
import MdTop from "../../assets/markdown/top.mdx"

const PageImportMdx = () => {
  return (
    <AppLayout>
      <Head>
        <title>import MDX</title>
      </Head>
      <h1>import MDX</h1>
      <MdVanilla />
      <MdTop />
    </AppLayout>
  )
}

export default PageImportMdx
