import "../assets/style-bundle.css"
import imageUrl from "../assets/image.png"

export default function () {
  return (
    <section>
      <h1>heading 1</h1>
      <h2>heading 2</h2>
      <img src={imageUrl} alt="" />
    </section>
  )
}
