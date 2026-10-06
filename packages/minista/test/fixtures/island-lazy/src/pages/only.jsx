import Counter from "../components/counter.jsx"
export default function Page() {
  const props = { initialCount: 9 }
  return <main><h1>Only Island</h1><Counter client:only {...props}><p slot="fallback">Loading...</p></Counter></main>
}
