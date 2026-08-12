import Counter from "../components/counter.jsx"

export default function Page() {
  return (
    <main>
      <h1>Preact compatibility</h1>
      <Counter client:load />
    </main>
  )
}
