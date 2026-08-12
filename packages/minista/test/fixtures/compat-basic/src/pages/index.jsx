import { Comment, Image, Search, Sprite, Svg } from "minista/assets"
import { Head } from "minista/head"

import { Counter } from "../components/counter.jsx"

export default function Index() {
  return (
    <>
      <Head htmlAttributes={{ lang: "en" }} bodyAttributes={{ class: "fixture" }}>
        <title>Compatibility fixture</title>
        <link rel="stylesheet" href="/src/assets/site.css" />
        <script type="module" src="/src/assets/client.js" />
      </Head>
      <main data-search>
        <Comment text="fixture comment" />
        <h1>Compatibility fixture</h1>
        <Svg src="/src/assets/pixel.svg" title="Pixel icon" className="icon" />
        <Sprite src="/src/assets/pixel.svg" title="Pixel sprite" />
        <Image src="/src/assets/pixel.svg" alt="Pixel" width={2} height={2} />
        <Counter initial={2} client:load />
        <Search client:load />
      </main>
    </>
  )
}
