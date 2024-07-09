import { useState, useCallback } from "react"

export default function () {
  const [count, setCount] = useState(0)
  const increment = useCallback(() => setCount((c) => c + 1), [])
  return (
    <div className="counter">
      <h3 className="counter-title">Counter</h3>
      <div className="counter-box">
        <button className="counter-button" onClick={increment} type="button">
          increment
        </button>
        <p className="counter-message">{"count: " + count}</p>
      </div>
    </div>
  )
}
