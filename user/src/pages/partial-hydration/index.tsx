import { Head } from "minista"

import AppLayout from "../../components/app-layout"
import BlockToggle from "../../components/block-toggle.js?ph"

const PagePartialHydration = () => {
  return (
    <AppLayout>
      <Head>
        <title>Partial Hydration</title>
      </Head>
      <h1>Partial Hydration</h1>
      <BlockToggle title="State 1" />
      <BlockToggle title="State 2" />
    </AppLayout>
  )
}

export default PagePartialHydration
