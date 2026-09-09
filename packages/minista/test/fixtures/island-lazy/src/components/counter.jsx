import { useEffect, useState } from "react"
import "./counter.css"
if (typeof window !== "undefined") {
  document.documentElement.dataset.islandEvaluations = String(Number(document.documentElement.dataset.islandEvaluations || 0) + 1)
}
export default function Counter() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    document.documentElement.dataset.islandHydrations = String(Number(document.documentElement.dataset.islandHydrations || 0) + 1)
  }, [])
  return <button className="lazy-counter" onClick={() => setCount(count + 1)}>Count: {count}</button>
}
