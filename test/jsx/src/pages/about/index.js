import { Helmet } from "react-helmet"
import { render } from "minista"

import AppLayout from "../../components/app-layout"

const PageAbout = () => {
  return render(
    <AppLayout>
      <Helmet>
        <title>About</title>
      </Helmet>
      <h1>About</h1>
    </AppLayout>
  )
}

export default PageAbout
