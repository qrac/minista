import { Head } from "minista"

import Logo from "../../assets/svgs/logo.svg"

const PageSvgr = () => {
  return (
    <>
      <Head>
        <title>SVGR</title>
      </Head>
      <h1>SVGR</h1>
      <Logo
        aria-label="minista"
        className="svgr-logo"
        width={400}
        height={88}
      />
    </>
  )
}

export default PageSvgr
