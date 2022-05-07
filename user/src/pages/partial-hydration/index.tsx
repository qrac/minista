import { Head } from "minista"

import AppLayout from "../../components/app-layout"
import BlockToggle from "../../components/block-toggle?ph"
import BlockCounter from "../../components/block-counter?ph"

const PagePartialHydration = () => {
  return (
    <AppLayout>
      <Head>
        <title>Partial Hydration</title>
      </Head>
      <h1>Partial Hydration</h1>
      <BlockToggle />
      <BlockToggle />
      <BlockCounter />
      <BlockCounter />
    </AppLayout>
  )
}

export default PagePartialHydration
