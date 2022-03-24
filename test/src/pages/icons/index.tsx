import { Head } from "minista"

import AppLayout from "../../components/app-layout"

const PageIcons = () => {
  return (
    <AppLayout>
      <Head>
        <title>Icons</title>
      </Head>
      <h1>Icons</h1>
      <svg className="svg-sprite-icon-solid">
        <use href="/assets/icons.svg#brand"></use>
      </svg>
      <svg className="svg-sprite-icon-outline">
        <use href="/assets/icons.svg#brand-alt"></use>
      </svg>
    </AppLayout>
  )
}

export default PageIcons
