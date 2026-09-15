import Counter from "../components/counter.jsx"

export default function Page() {
  const initialCount = 5
  return (
    <main>
      <h1>Preact compatibility</h1>
      <Counter client:load initialCount={initialCount}><span>Serialized child</span></Counter>
    </main>
  )
}
