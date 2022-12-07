import "../../assets/heading.css"
import imageUrl from "../../assets/image.png"

export default function () {
  return (
    <>
      <h1>heading 1</h1>
      <h2>heading 2</h2>
      <p id="js-text"></p>
      <div>
        <img
          src={imageUrl}
          srcSet={`${imageUrl} 768w, ${imageUrl} 1024w`}
          width="220"
          height="108"
          alt=""
        />
      </div>
    </>
  )
}
