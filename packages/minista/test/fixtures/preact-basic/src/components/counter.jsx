import { useState } from "react"
import thumb from "./thumb.svg"

export default function Counter({ initialCount = 0, children }) {
  const [count, setCount] = useState(initialCount)
  return (
    <div>
      {children}
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <img src={thumb} alt="" />
    </div>
  )
}
