import { Counter } from "../components/counter"

export default function () {
  return (
    <>
      <h1>Preact Island</h1>
      <p>The React counter runs on Preact in development and production.</p>
      <Counter defaultCount={1} client:load />
    </>
  )
}
