import { useState } from "react"

export function Counter({ initial = 0 }) {
  const [count, setCount] = useState(initial)

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>
}
