import { Head } from "minista-plugin-ssg/client"

import { Button } from "../components/button"
import iconUrl from "../assets/icon.png"

export default function () {
  return (
    <>
      <Head>
        <link rel="stylesheet" href="/src/assets/style.css" data-test="" />
        <link rel="stylesheet" href="/src/assets/dummy.css" />
        <script type="module" src="/src/assets/script.ts" />
      </Head>
      <h1>Index</h1>
      <ul>
        <li>
          <a href="/nest/">Nest</a>
        </li>
      </ul>
      <div>
        <Button>Button</Button>
      </div>
      <div>
        <img src={iconUrl} alt="icon" width={76} height={76} />
      </div>
    </>
  )
}
