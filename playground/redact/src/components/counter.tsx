import { useState } from "react"

export function Counter({ defaultCount = 0 }: { defaultCount?: number }) {
  const [count, setCount] = useState(defaultCount)

  return (
    <button type="button" onClick={() => setCount((value) => value + 1)}>
      Count: {count}
    </button>
  )
}
