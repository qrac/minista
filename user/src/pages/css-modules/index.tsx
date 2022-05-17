import { Head } from "minista"
import style from "../../assets/css-modules/style.module.css"

import AppLayout from "../../components/app-layout"

const PageCssModules = () => {
  return (
    <AppLayout>
      <Head>
        <title>CSS Modules</title>
      </Head>
      <h1>CSS Modules</h1>
      <h2 className={style.test}>test scope style</h2>
    </AppLayout>
  )
}

export default PageCssModules
