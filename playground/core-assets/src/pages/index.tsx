import "../assets/style-bundle.css"
import imageUrl from "../assets/image.png"

export default function () {
  return (
    <>
      <h1>heading 1</h1>
      <h2>heading 2</h2>
      <p id="script-entry"></p>
      <div>
        <img src={imageUrl} width="220" height="108" alt="" />
      </div>
    </>
  )
}
