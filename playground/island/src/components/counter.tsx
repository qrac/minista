import { useState, useCallback, useEffect } from "react"

export function Counter({ defaultCount = 0 }: { defaultCount?: number }) {
  const [active, setActive] = useState(false)
  const [count, setCount] = useState(defaultCount)
  const increment = useCallback(() => setCount((c) => c + 1), [])
  useEffect(() => {
    if (!active) setActive(true)
  }, [])
  return (
    <div
      className="component-counter"
      style={{ padding: "12px", border: "1px solid #000" }}
    >
      <div>
        <button onClick={increment} type="button">
          increment
        </button>
        <span>｜</span>
        <span>count: </span>
        <span>{count}</span>
        <span>｜</span>
        {active ? (
          <span style={{ color: "green" }}>active</span>
        ) : (
          <span style={{ color: "red" }}>Inactive</span>
        )}
      </div>
    </div>
  )
}
