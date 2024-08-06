import { Svg } from "minista-plugin-svg/client"

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
        <Svg src="/src/assets/square.svg" className="square" />
      </div>
      <div>
        <Svg src="/src/assets/square-red.svg" id="square-red" />
      </div>
      <div>
        <Svg src="/src/assets/square-trim.svg" title="square-trim" />
      </div>
      <div>
        <Svg src="/src/assets/circle.svg" data-test="circle" />
      </div>
    </>
  )
}
