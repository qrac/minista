import { Counter } from "../components/counter"

export default function () {
  return (
    <>
      <h1>Redact Island</h1>
      <p>The React counter runs on Redact in the browser.</p>
      <Counter defaultCount={1} client:load />
    </>
  )
}
