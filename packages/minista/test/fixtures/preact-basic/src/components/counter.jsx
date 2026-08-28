import { useState } from "react"
import thumb from "./thumb.svg"

export default function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <img src={thumb} alt="" />
    </div>
  )
}
