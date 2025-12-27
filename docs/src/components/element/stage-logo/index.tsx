import { clsx } from "clsx"
import { Svg } from "minista/assets"

import logoV1 from "../../../assets/images/logo-v1.svg"
import logoV3 from "../../../assets/images/logo-v3.svg"
import logoV4 from "../../../assets/images/logo-v4.svg"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function ElementStageLogo(props: Partial<Props>) {
  const { version } = { ...initialProps, ...props }
  const logos = {
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
      caption: "minista Logo (v3)",
    },
    4: {
      width: 147,
      height: 32,
      src: logoV4,
      caption: "minista Logo (v4 ~)",
    },
  }
  const logo = logos[version]
  return (
    <div className="box is-outline is-bg-2 is-radius-xl is-p-xl is-space-xs">
      <div className="box is-flex is-center">
        <div
          className={clsx(
            "box is-px-md is-py-sm is-radius-lg",
            version <= 3 && "is-bg-2-only-dark"
          )}
        >
          <img
            className="image"
            src={logo.src}
            alt="minista"
            width={logo.width}
            height={logo.height}
          />
        </div>
      </div>
      <p className="text is-font-mono is-tx-3 is-center is-nb-xs is-xs">
        {logo.caption}
      </p>
    </div>
  )
}
