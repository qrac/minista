import { Head } from "minista"

import BlockToggle from "../../components/block-toggle?ph"
import BlockCounter from "../../components/block-counter?ph"

const PagePartialHydration = () => {
  return (
    <>
      <Head>
        <title>Partial Hydration</title>
      </Head>
      <h1>Partial Hydration</h1>
      <BlockToggle />
      <BlockToggle />
      <BlockCounter />
      <BlockCounter />
    </>
  )
}

export default PagePartialHydration
