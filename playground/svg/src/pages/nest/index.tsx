import { Svg } from "minista-plugin-svg/client"

export default function () {
  return (
    <>
      <h1>Nest</h1>
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
