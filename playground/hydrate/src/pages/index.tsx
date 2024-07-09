import Counter from "../components/counter?ph"
import Toggle from "../components/toggle?ph"

export default function () {
  return (
    <>
      <h1>Index</h1>
      <ul>
        <li>
          <a href="/about">About</a>
        </li>
        <li>
          <a href="/nest/">Nest</a>
        </li>
        <li>
          <a href="/nest/about">Nest About</a>
        </li>
      </ul>
      <Counter />
      <Counter />
      <Toggle />
      <Toggle />
    </>
  )
}
