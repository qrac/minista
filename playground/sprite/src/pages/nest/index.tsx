import { Sprite } from "minista-plugin-sprite/client"

export default function () {
  return (
    <>
      <h1>Nest</h1>
      <div>
        <Sprite symbolId="square" />
      </div>
      <div>
        <Sprite symbolId="square-red" />
      </div>
      <div>
        <Sprite symbolId="square-trim" />
      </div>
      <div>
        <Sprite symbolId="circle" spriteKey="sprite2" />
      </div>
    </>
  )
}
