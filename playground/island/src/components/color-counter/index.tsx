import { useState, useCallback, useEffect } from "react"

import "./index.css"
import thumb from "./thumb.png"

export function ColorCounter({ defaultCount = 0 }: { defaultCount?: number }) {
  const [active, setActive] = useState(false)
  const [count, setCount] = useState(defaultCount)
  const increment = useCallback(() => setCount((c) => c + 1), [])
  useEffect(() => {
    if (!active) setActive(true)
  }, [])
  return (
    <div
      className="component-color-counter"
      style={{ padding: "12px", border: "1px solid #000" }}
    >
      <div>
        <button onClick={increment} type="button">
          increment
        </button>
        <span>｜</span>
        <span>count: </span>
        <span className={count % 2 === 0 ? "even" : "odd"}>{count}</span>
        <span>｜</span>
        {active ? (
          <span style={{ color: "green" }}>active</span>
        ) : (
          <span style={{ color: "red" }}>Inactive</span>
        )}
      </div>
      <div>
        <img
          src={thumb}
          alt=""
          width={150}
          height={50}
          style={{ marginTop: "12px", border: "1px solid #000" }}
        />
      </div>
    </div>
  )
}
