import { clsx } from "clsx"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function ElementStageSpeed(props: Partial<Props>) {
  const {} = { ...initialProps, ...props }
  return (
    <div className="box is-outline is-bg-2 is-radius-xl is-px-xl is-py-xxl is-space-md">
      <div className="box">
        <Record
          titleTexts={["develop:", "v1-latest"]}
          width={85}
          color="secondary"
          resultTexts={["9.1715s"]}
        />
        <Comparison beforeWidth={85} afterWidth={5} />
        <Record
          titleTexts={["develop:", "v2.0.0"]}
          width={5}
          color="primary"
          resultTexts={["0.6006s", "(-93.45%)"]}
        />
      </div>
      <div className="box">
        <Record
          titleTexts={["build:", "v1-latest"]}
          width={100}
          color="secondary"
          resultTexts={["10.7899s"]}
        />
        <Comparison beforeWidth={100} afterWidth={55} />
        <Record
          titleTexts={["build:", "v2.0.0"]}
          width={55}
          color="primary"
          resultTexts={["5.9628s", "(-44.73%)"]}
        />
      </div>
      <p className="text is-font-mono is-tx-3 is-center is-nb-xs is-xs">
        {"Example: { js: 319KB, css: 101KB, components: 38, pages: 15 }"}
      </p>
    </div>
  )
}

function Record({
  titleTexts,
  width,
  color,
  resultTexts,
}: {
  titleTexts: string[]
  width: number
  color: "primary" | "secondary"
  resultTexts: string[]
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
        {titleTexts.map((text, index) => (
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
        {resultTexts.map((text, index) => (
          <span key={index} className="text is-block">
            {text}
          </span>
        ))}
      </p>
    </div>
  )
}

function Comparison({
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
