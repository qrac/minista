import { ColorCounter } from "../../components/color-counter"

export default function () {
  return (
    <>
      <h1>Nest</h1>
      <div style={{ display: "grid", gap: "20px" }}>
        <ColorCounter defaultCount={0} client:load />
        <ColorCounter defaultCount={0} client:only />
      </div>
    </>
  )
}
