import { Image, Picture } from "minista/client"

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
          width={600}
          artDirectives={[
            {
              media: `(max-width: 600px)`,
              src: "/src/assets/image2.png",
              width: 200,
            },
            {
              media: `(min-width: 601px)`,
              src: "/src/assets/image.png",
              width: 600,
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
      <div>
        <Image
          src="https://picsum.photos/id/11/800/600"
          remoteName="forest"
          width={800}
        />
      </div>
      <div>
        <Picture
          src="/src/assets/check-desktop.png"
          outName="[name]"
          breakpoints={[1920]}
          artDirectives={[
            {
              media: `(min-width: 1920px)`,
              src: "/src/assets/check-desktop.png",
              formats: ["webp"],
              breakpoints: [1920],
            },
            {
              media: `(min-width: 1440px)`,
              src: "/src/assets/check-laptop.png",
              formats: ["webp"],
              breakpoints: [1440],
            },
            {
              media: `(min-width: 375px)`,
              src: "/src/assets/check-mobile.png",
              formats: ["webp"],
              breakpoints: [375],
            },
          ]}
        />
      </div>
    </>
  )
}
