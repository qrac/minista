import { clsx } from "clsx"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function ElementStageSpeed(props: Partial<Props>) {
  const {} = { ...initialProps, ...props }
  return (
    <div
      className="box is-bg-2 is-radius-xl is-px-xl is-py-xxl is-space-md"
      data-stage="speed"
    >
      <div className="box">
        <Content
          beforeTexts={["develop:", "v1-latest"]}
          width={85}
          color="secondary"
          afterTexts={["9.1715s"]}
        />
        <Space beforeWidth={85} afterWidth={5} />
        <Content
          beforeTexts={["develop:", "v2.0.0"]}
          width={5}
          color="primary"
          afterTexts={["0.6006s", "(-93.45%)"]}
        />
      </div>
      <div className="box">
        <Content
          beforeTexts={["build:", "v1-latest"]}
          width={100}
          color="secondary"
          afterTexts={["10.7899s"]}
        />
        <Space beforeWidth={100} afterWidth={55} />
        <Content
          beforeTexts={["build:", "v2.0.0"]}
          width={55}
          color="primary"
          afterTexts={["5.9628s", "(-44.73%)"]}
        />
      </div>
      <p className="text is-font-mono is-tx-3 is-center is-nb-xs is-xs">
        {"Example: { pages: 15, components: 38, css: 101KB, js: 319KB }"}
      </p>
    </div>
  )
}

function Content({
  beforeTexts,
  width,
  color,
  afterTexts,
}: {
  beforeTexts: string[]
  width: number
  color: "primary" | "secondary"
  afterTexts: string[]
}) {
  const widthFr = width / 100
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `68px ${widthFr}fr 68px`,
        alignItems: "center",
        gap: "8px",
      }}
    >
      <p className="text is-font-mono is-line-height-xs is-xs">
        {beforeTexts.map((text, index) => (
          <span key={index} className="text is-block">
            {text}
          </span>
        ))}
      </p>
      <div style={{ height: "32px", background: `var(--theme-${color})` }} />
      <p
        className={clsx(
          "text is-font-mono is-line-height-xs is-xs",
          color === "primary" && "is-primary"
        )}
      >
        {afterTexts.map((text, index) => (
          <span key={index} className="text is-block">
            {text}
          </span>
        ))}
      </p>
    </div>
  )
}

function Space({
  beforeWidth,
  afterWidth,
}: {
  beforeWidth: number
  afterWidth: number
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `68px 1fr 68px`,
        alignItems: "center",
        gap: "8px",
      }}
    >
      <div />
      <div
        style={{
          height: "24px",
          background: "var(--theme-bg-3)",
          clipPath: `polygon(0 0, ${beforeWidth}% 0, ${afterWidth}% 100%, 0 100%)`,
        }}
      />
      <div />
    </div>
  )
}
