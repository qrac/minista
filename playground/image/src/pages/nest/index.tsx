import { Image, Picture } from "minista-plugin-image/client"

export default function () {
  return (
    <>
      <h1>Nest</h1>
      <div>
        <Image src="/src/assets/image.png" width={800} />
      </div>
      <div>
        <Image src="/src/assets/image2.png" width={200} />
      </div>
      <div>
        <Image
          src="/src/assets/image.png"
          width={200}
          layout="fixed"
          aspect={"1:1"}
        />
      </div>
      <div>
        <Picture
          src="/src/assets/image.png"
          width={200}
          layout="fixed"
          formats={["webp", "inherit"]}
        />
      </div>
      <div>
        <Image src="https://picsum.photos/id/1/800/600" width={800} />
      </div>
      <div>
        <Image src="https://picsum.photos/id/10/800/600" width={800} />
      </div>
    </>
  )
}
