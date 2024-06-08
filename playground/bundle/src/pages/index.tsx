import { Button } from "../components/button"
import iconUrl from "../assets/icon.png"

export default function () {
  return (
    <>
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
