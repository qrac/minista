import { Head } from "minista"
import pkg from "minista/package.json"

import AppLayout from "../../components/app-layout"

const PageImportModules = () => {
  return (
    <AppLayout>
      <Head>
        <title>import Modules</title>
      </Head>
      <h1>import Modules</h1>
      <h2>test node_module json</h2>
      <p>minista v{pkg.version}</p>
    </AppLayout>
  )
}

export default PageImportModules
