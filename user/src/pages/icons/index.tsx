import { Head } from "minista"

const PageIcons = () => {
  return (
    <>
      <Head>
        <title>Icons</title>
      </Head>
      <h1>Icons</h1>
      <svg className="svg-sprite-icon-solid">
        <use href="/assets/images/icons.svg#brand"></use>
      </svg>
      <svg className="svg-sprite-icon-outline">
        <use href="/assets/images/icons.svg#brand-alt"></use>
      </svg>
    </>
  )
}

export default PageIcons
