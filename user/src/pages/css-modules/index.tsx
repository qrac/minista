import { Head } from "minista"
import style from "~/assets/css-modules/style.module.css"

const PageCssModules = () => {
  return (
    <>
      <Head>
        <title>CSS Modules</title>
      </Head>
      <h1>CSS Modules</h1>
      <h2 className={style.test}>test scope style</h2>
    </>
  )
}

export default PageCssModules
