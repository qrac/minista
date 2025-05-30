import { Svg } from "minista/assets"

export default function () {
  return (
    <>
      <h1>Nest</h1>
      <div style={{ width: "200px" }}>
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
      </div>
    </>
  )
}
