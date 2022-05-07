import { useState, useCallback } from "react"

const BlockCounter = () => {
  const [count, setCount] = useState(0)
  const increment = useCallback(() => setCount((c) => c + 1), [])
  return (
    <div className="block-counter">
      <h3 className="block-counter-title">Block Counter</h3>
      <div className="block-counter-box">
        <button
          className="block-counter-button"
          onClick={increment}
          type="button"
        >
          increment
        </button>
        <p className="block-counter-message">count: {count}</p>
      </div>
    </div>
  )
}

export default BlockCounter
