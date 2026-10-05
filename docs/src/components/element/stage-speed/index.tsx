import { clsx } from "clsx"

import type { Props } from "./props"
import { initialProps } from "./props"

export default function ElementStageSpeed(props: Partial<Props>) {
  const { comparisons, caption } = { ...initialProps, ...props }
  return (
    <div
      className="box is-bg-2 is-radius-xl is-px-xl is-py-xxl is-space-md"
      data-stage="speed"
    >
      {comparisons.map(({ label, unit, before, after }, index) => {
        const max = Math.max(before.value, after.value)
        const beforeWidth = max > 0 ? (before.value / max) * 100 : 0
        const afterWidth = max > 0 ? (after.value / max) * 100 : 0
        const change =
          before.value > 0
            ? `(${(((after.value - before.value) / before.value) * 100).toFixed(2)}%)`
            : null
        return (
          <div key={index} className="box">
            <Content
              beforeTexts={[label, before.label]}
              width={beforeWidth}
              color="secondary"
              afterTexts={[`${before.value}${unit}`]}
            />
            <Space beforeWidth={beforeWidth} afterWidth={afterWidth} />
            <Content
              beforeTexts={[label, after.label]}
              width={afterWidth}
              color="primary"
              afterTexts={[`${after.value}${unit}`, ...(change ? [change] : [])]}
            />
          </div>
        )
      })}
      {caption && (
        <p className="text is-font-mono is-tx-3 is-center is-nb-xs is-xs">
          {caption}
        </p>
      )}
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
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "80px minmax(0, 1fr) 88px",
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
      <div>
        <div
          style={{
            width: `${width}%`,
            height: "32px",
            background: `var(--theme-${color})`,
          }}
        />
      </div>
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
        gridTemplateColumns: "80px minmax(0, 1fr) 88px",
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
