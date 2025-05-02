import { Sprite } from "minista/client"

export default function () {
  return (
    <>
      <h1>Nest</h1>
      <div style={{ width: "200px" }}>
        <div>
          <Sprite src="/src/assets/sprite/square.svg" />
        </div>
        <div>
          <Sprite src="/src/assets/sprite/square-red.svg" />
        </div>
        <div>
          <Sprite src="/src/assets/sprite/square-trim.svg" />
        </div>
        <div>
          <Sprite
            src="/src/assets/sprite/common-sprite.svg"
            symbolId="common-square"
          />
        </div>
        <div>
          <Sprite
            src="/src/assets/sprite/common-sprite.svg"
            symbolId="common-square-red"
          />
        </div>
        <div>
          <Sprite
            src="/src/assets/sprite/common-sprite.svg"
            symbolId="common-square-trim"
          />
        </div>
        <div>
          <Sprite src="/src/assets/sprite2/circle.svg" />
        </div>
      </div>
    </>
  )
}
