import { Image, Picture } from "minista"

export default function () {
  return (
    <>
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
        <Picture
          src="/src/assets/image.png"
          artDirectives={[
            {
              media: `(max-width: 600px)`,
              src: "/src/assets/image2.png",
            },
            {
              media: `(min-width: 601px)`,
              src: "/src/assets/image.png",
            },
          ]}
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
