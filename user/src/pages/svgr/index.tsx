import { Head } from "minista"

import AppLayout from "../../components/app-layout"
import Logo from "../../assets/svgs/logo.svg"

const PageSvgr = () => {
  return (
    <AppLayout>
      <Head>
        <title>SVGR</title>
      </Head>
      <h1>SVGR</h1>
      <Logo title="minista" className="svgr-logo" width={400} height={88} />
    </AppLayout>
  )
}

export default PageSvgr
