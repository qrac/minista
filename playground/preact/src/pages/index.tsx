import { Counter } from "../components/counter"

export default function () {
  return (
    <>
      <h1>Preact Island</h1>
      <p>The React counter is converted to Preact in the client build.</p>
      <Counter defaultCount={1} client:load />
    </>
  )
}
