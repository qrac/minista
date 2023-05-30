import logoV1 from "../../assets/svgs/logo-v1.svg"
import logoV3 from "../../assets/svgs/logo-v3.svg"

type Logo = {
  width: number
  height: number
  src: string
  caption: string
}
type Logos = { [key: number | string]: Logo }

const logos: Logos = {
  1: {
    width: 120,
    height: 26,
    src: logoV1,
    caption: "minista Logo (v0 ~ v2)",
  },
  3: {
    width: 147,
    height: 32,
    src: logoV3,
    caption: "minista Logo (v3 ~)",
  },
}

export default function ({ version }: { version: number }) {
  const logo: Logo = logos[version]
  return (
    <figure className="block-logo-stage">
      <img
        className="block-logo-stage-image"
        src={logo.src}
        alt="minista"
        width={logo.width}
        height={logo.height}
      />
      <figcaption className="block-logo-stage-caption">
        {logo.caption}
      </figcaption>
    </figure>
  )
}
