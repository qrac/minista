import { useState } from "react"

export default function Counter({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount)
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>
}
